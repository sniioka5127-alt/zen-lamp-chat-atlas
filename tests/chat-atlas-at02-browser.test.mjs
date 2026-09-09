import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

async function loadRuntime() {
  const source = await fs.readFile(new URL("../chat-atlas/browser-runtime.js", import.meta.url), "utf8");
  const sandbox = { console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "browser-runtime.js" });
  return sandbox.ChatAtlasAT02;
}

test("AT-02 classic runtime exposes the AT-01 producer contract", async () => {
  const runtime = await loadRuntime();
  assert.ok(runtime);
  assert.equal(runtime.ATLAS_CONTRACT_VERSION, "at-01");

  const prompt = runtime.buildAtlasProducerPrompt({
    title: "Test Project",
    conversation: "User: We decided to keep human approval explicit.",
    mode: "producer"
  });
  assert.match(prompt, /ContextItem producer/);
  assert.match(prompt, /may NOT approve/);
  assert.match(prompt, /may NOT generate a Next Chat Handoff/);
  assert.match(prompt, /context_items/);
});

test("AT-02 browser parser follows the active ChatGPT branch", async () => {
  const runtime = await loadRuntime();
  const conv = {
    id: "conv1",
    title: "Branch test",
    current_node: "u2",
    mapping: {
      root: { id: "root", parent: null, children: ["u1"], message: null },
      u1: {
        id: "u1",
        parent: "root",
        children: ["a1", "a1b"],
        message: { id: "m1", author: { role: "user" }, create_time: 1, content: { parts: ["Question"] } }
      },
      a1: {
        id: "a1",
        parent: "u1",
        children: ["u2"],
        message: { id: "m2", author: { role: "assistant" }, create_time: 2, content: { parts: ["Chosen answer"] } }
      },
      a1b: {
        id: "a1b",
        parent: "u1",
        children: [],
        message: { id: "m3", author: { role: "assistant" }, create_time: 3, content: { parts: ["Regenerated sibling"] } }
      },
      u2: {
        id: "u2",
        parent: "a1",
        children: [],
        message: { id: "m4", author: { role: "user" }, create_time: 4, content: { parts: ["Follow-up"] } }
      }
    }
  };

  const parsed = runtime.parseChatGPTConversationsBranchAware([conv]);
  assert.equal(parsed.length, 1);
  const texts = Array.from(parsed[0].messages, m => m.text);
  assert.deepEqual(texts, ["Question", "Chosen answer", "Follow-up"]);
  assert.equal(texts.includes("Regenerated sibling"), false);
  assert.equal(parsed[0].branch.alternative_branch_count, 1);
});

test("AT-02 parses AI output into portable proposal-only ContextItems", async () => {
  const runtime = await loadRuntime();
  const result = runtime.parseAtlasResponse(`\`\`\`json
  {
    "contract_version": "at-01",
    "conversation_summary": "summary",
    "context_items": [{
      "content": "Human approval is required.",
      "kind": "constraint",
      "atlas_marker": "constraint",
      "source": { "actor_type": "human" },
      "provenance": { "source_refs": ["turn:1"] },
      "rationale": "Stable boundary",
      "status": "approved",
      "memory_policy": "keep",
      "transfer_policy": "allow"
    }]
  }
  \`\`\``);

  const item = runtime.toPortableContextItem(result.context_items[0], {
    projectId: "prj_test",
    conversationId: "conv1",
    defaultPlatform: "ChatGPT"
  });

  assert.equal(item.project_id, "prj_test");
  assert.equal(item.memory_policy, "review");
  assert.equal(item.transfer_policy, "manual_only");
  assert.equal(item.provenance.derived, true);
  assert.equal(item.provenance.derived_by, "chat_atlas");
  assert.equal("status" in item, false);
  assert.equal("human_review" in item, false);
  assert.equal(item.source.conversation_id, "conv1");
});
