import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAtlasProducerPrompt,
  parseAtlasResponse,
  toPortableContextItem
} from "../chat-atlas/producer.mjs";
import {
  extractActiveBranch,
  parseChatGPTConversationsBranchAware
} from "../chat-atlas/chatgpt-branch.mjs";

const sampleResponse = `\`\`\`json
{
  "contract_version": "at-01",
  "conversation_summary": "A project architecture was clarified.",
  "context_items": [
    {
      "content": "The product is integrated while module responsibilities remain separated.",
      "kind": "decision",
      "atlas_marker": "decision",
      "source": { "actor_type": "human", "platform": "ChatGPT" },
      "provenance": { "original_text": "One house, four rooms.", "source_refs": ["User turn: one house"] },
      "rationale": "Stable architecture decision",
      "confidence_note": null,
      "status": "approved",
      "memory_policy": "keep",
      "transfer_policy": "allow",
      "human_review": { "state": "approved" }
    }
  ],
  "turning_points": ["four-room model adopted"],
  "conflicts": [],
  "unresolved_questions": [],
  "boundary_risks": []
}
\`\`\``;

test("AT-01 prompt defines Chat Atlas as producer, not memory or handoff authority", () => {
  const prompt = buildAtlasProducerPrompt({
    title: "HIRAKU Tools",
    conversation: "User: One house, four rooms.\nAssistant: Good architecture.",
    mode: "producer",
    language: "ja",
    target: "gpt"
  });

  assert.match(prompt, /ContextItem producer/);
  assert.match(prompt, /not a Memory Curator/);
  assert.match(prompt, /NOT generate a Next Chat Handoff/);
  assert.match(prompt, /Do NOT output status/);
  assert.match(prompt, /memory_policy/);
  assert.match(prompt, /transfer_policy/);
});

test("AT-01 parser ignores AI attempts to control governance fields", () => {
  const parsed = parseAtlasResponse(sampleResponse);
  assert.equal(parsed.context_items.length, 1);
  const candidate = parsed.context_items[0];
  assert.equal(candidate.kind, "decision");
  assert.equal("status" in candidate, false);
  assert.equal("memory_policy" in candidate, false);
  assert.equal("transfer_policy" in candidate, false);
  assert.equal("human_review" in candidate, false);
});

test("AT-01 portable ContextItem uses safe Core defaults and remains unapproved", () => {
  const candidate = parseAtlasResponse(sampleResponse).context_items[0];
  const portable = toPortableContextItem(candidate, {
    projectId: "prj_test",
    conversationId: "conv_test",
    defaultPlatform: "ChatGPT"
  });

  assert.equal(portable.project_id, "prj_test");
  assert.equal(portable.memory_policy, "review");
  assert.equal(portable.transfer_policy, "manual_only");
  assert.equal(portable.provenance.derived, true);
  assert.equal(portable.provenance.derived_by, "chat_atlas");
  assert.equal(portable.source.conversation_id, "conv_test");
  assert.equal("status" in portable, false);
  assert.equal("human_review" in portable, false);
});

function msg(id, role, text, time) {
  return {
    id,
    author: { role },
    create_time: time,
    content: { parts: [text] }
  };
}

test("AT-01 ChatGPT parser follows current_node and excludes regenerated sibling branch", () => {
  const conv = {
    id: "conv1",
    current_node: "u2",
    mapping: {
      root: { id: "root", parent: null, children: ["u1"], message: null },
      u1: { id: "u1", parent: "root", children: ["a1", "a1b"], message: msg("u1m", "user", "Question", 1) },
      a1: { id: "a1", parent: "u1", children: ["u2"], message: msg("a1m", "assistant", "Chosen answer", 2) },
      a1b: { id: "a1b", parent: "u1", children: [], message: msg("a1bm", "assistant", "Regenerated sibling", 3) },
      u2: { id: "u2", parent: "a1", children: [], message: msg("u2m", "user", "Continue", 4) }
    }
  };

  const branch = extractActiveBranch(conv);
  assert.equal(branch.branch_mode, "current_node");
  assert.deepEqual(branch.messages.map(m => m.text), ["Question", "Chosen answer", "Continue"]);
  assert.equal(branch.messages.some(m => m.text === "Regenerated sibling"), false);
  assert.equal(branch.alternative_branch_count, 1);
});

test("AT-01 fallback chooses a deepest leaf instead of mixing all branches", () => {
  const raw = [{
    id: "conv2",
    title: "Fallback",
    mapping: {
      root: { parent: null, message: null },
      u1: { parent: "root", message: msg("u1m", "user", "Start", 1) },
      a1: { parent: "u1", message: msg("a1m", "assistant", "Short branch", 2) },
      a2: { parent: "u1", message: msg("a2m", "assistant", "Long branch", 3) },
      u2: { parent: "a2", message: msg("u2m", "user", "Continue long branch", 4) }
    }
  }];

  const parsed = parseChatGPTConversationsBranchAware(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].branch.branch_mode, "deepest_leaf_fallback");
  assert.deepEqual(parsed[0].messages.map(m => m.text), ["Start", "Long branch", "Continue long branch"]);
  assert.equal(parsed[0].messages.some(m => m.text === "Short branch"), false);
});
