import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

async function loadProjectBindingRuntime() {
  const source = await fs.readFile(new URL("../chat-atlas/project-binding.js", import.meta.url), "utf8");
  const sandbox = { console, URLSearchParams };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "project-binding.js" });
  return sandbox.ChatAtlasAT03;
}

async function loadAtlasRuntime() {
  const source = await fs.readFile(new URL("../chat-atlas/browser-runtime.js", import.meta.url), "utf8");
  const sandbox = { console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "browser-runtime.js" });
  return sandbox.ChatAtlasAT02;
}

test("AT-03: Workspace fragment binds a safe Human Project reference locally", async () => {
  const runtime = await loadProjectBindingRuntime();
  const binding = runtime.resolveProjectBinding({
    fragment: "#project=prj_123e4567-e89b-12d3-a456-426614174000",
    manualProjectId: "prj_123e4567-e89b-12d3-a456-426614174000"
  });

  assert.equal(binding.binding_version, "AT-03");
  assert.equal(binding.state, "bound");
  assert.equal(binding.project_id, "prj_123e4567-e89b-12d3-a456-426614174000");
  assert.equal(binding.source, "workspace_fragment");
  assert.equal(binding.authority, "human_project_reference");
  assert.equal(binding.project_store_verification, "not_verified");
  assert.equal(binding.network_disclosure, "fragment_not_sent_in_http_request");
});

test("AT-03: manual local binding remains available for standalone use", async () => {
  const runtime = await loadProjectBindingRuntime();
  const binding = runtime.resolveProjectBinding({ manualProjectId: "prj_manual_local" });
  assert.equal(binding.state, "bound");
  assert.equal(binding.source, "manual_local_input");
  assert.equal(binding.project_id, "prj_manual_local");
  assert.equal(binding.network_disclosure, "none");
});

test("AT-03: unbound mode remains valid and does not fabricate a Project", async () => {
  const runtime = await loadProjectBindingRuntime();
  const binding = runtime.resolveProjectBinding();
  assert.equal(binding.state, "unbound");
  assert.equal(binding.project_id, null);
  assert.equal(binding.project_store_verification, "not_verified");
});

test("AT-03: fragment/manual mismatch is rejected instead of silently crossing Projects", async () => {
  const runtime = await loadProjectBindingRuntime();
  assert.throws(() => runtime.resolveProjectBinding({
    fragment: "#project=prj_alpha",
    manualProjectId: "prj_beta"
  }), /Project binding mismatch/);
});

test("AT-03: unsafe Project IDs are rejected", async () => {
  const runtime = await loadProjectBindingRuntime();
  for (const value of ["project_alpha", "prj_", "prj_<script>", "prj_a b", "https://example.com"]) {
    assert.throws(() => runtime.normalizeProjectId(value, { allowNull: false }));
  }
});

test("AT-03: AI output cannot override the Human-bound Project ID", async () => {
  const atlas = await loadAtlasRuntime();
  const parsed = atlas.parseAtlasResponse(`\`\`\`json
  {
    "contract_version": "at-01",
    "project_id": "prj_attacker",
    "context_items": [{
      "content": "Keep Human approval explicit.",
      "kind": "constraint",
      "atlas_marker": "constraint",
      "project_id": "prj_attacker",
      "status": "approved",
      "memory_policy": "keep",
      "transfer_policy": "allow"
    }]
  }
  \`\`\``);

  const item = atlas.toPortableContextItem(parsed.context_items[0], {
    projectId: "prj_human_bound",
    conversationId: "conv-1",
    defaultPlatform: "ChatGPT"
  });

  assert.equal(item.project_id, "prj_human_bound");
  assert.equal(item.memory_policy, "review");
  assert.equal(item.transfer_policy, "manual_only");
  assert.equal("status" in item, false);
});

test("AT-03: Project ID is routing metadata and is not added to the external AI prompt", async () => {
  const atlas = await loadAtlasRuntime();
  const prompt = atlas.buildAtlasProducerPrompt({
    title: "Bound conversation",
    conversation: "User: A Project reference should remain local routing metadata.",
    mode: "producer"
  });
  assert.doesNotMatch(prompt, /prj_/);
  assert.match(prompt, /ContextItem producer/);
});

test("AT-03: browser integration uses fragment binding, exports binding metadata, and adds no network automation", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /chat-atlas\/project-binding\.js/);
  assert.match(html, /id="projectBindingStatus"/);
  assert.match(html, /location\.hash/);
  assert.match(html, /resolveProjectBinding/);
  assert.match(html, /project_binding:\s*binding/);
  assert.match(html, /binding\.project_id/);
  assert.doesNotMatch(html, /new URLSearchParams\(location\.search\)[\s\S]{0,200}project/);
  assert.doesNotMatch(html, /\bfetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
});
