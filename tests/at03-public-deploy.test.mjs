import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("AT-03 public index references both governed browser scripts", () => {
  const index = read("index.html");
  assert.match(index, /<script src="\.\/chat-atlas\/browser-runtime\.js"><\/script>/);
  assert.match(index, /<script src="\.\/chat-atlas\/project-binding\.js"><\/script>/);
  assert.match(index, /bootstrapProjectBinding\(\)/);
});

test("AT-03 project binding keeps Human Project authority local", () => {
  const binding = read("chat-atlas/project-binding.js");
  assert.match(binding, /ATLAS_PROJECT_BINDING_VERSION/);
  assert.match(binding, /human_project_reference/);
  assert.match(binding, /project_store_verification/);
  assert.doesNotMatch(binding, /\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon/i);
});

test("public deployment builder packages only the required Chat Atlas runtime files", () => {
  const builder = read("scripts/build-public-deploy.mjs");
  for (const file of [
    '"index.html"',
    '"chat-atlas/browser-runtime.js"',
    '"chat-atlas/project-binding.js"'
  ]) assert.match(builder, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(builder, /DEPLOYMENT_MANIFEST\.json/);
  assert.match(builder, /https:\/\/zen-lamp\.com\/tools\/chat-atlas\//);
});
