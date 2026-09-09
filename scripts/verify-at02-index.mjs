import fs from "node:fs/promises";

const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");

const required = [
  'data-at02="browser-runtime-integrated"',
  './chat-atlas/browser-runtime.js',
  'id="projectIdInput"',
  'id="atlasResultInput"',
  'id="parseAtlasResultBtn"',
  'id="contextItemsOutput"',
  'window.ChatAtlasAT02.parseChatGPTConversationsBranchAware',
  'window.ChatAtlasAT02.buildAtlasProducerPrompt',
  'window.ChatAtlasAT02.parseAtlasResponse',
  'window.ChatAtlasAT02.toPortableContextItem',
  'value="producer"',
  'value="thinking"',
  'value="decisions"',
  'value="full"'
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`AT-02 index missing marker: ${marker}`);
}

const forbidden = [
  '<option value="governance">',
  '<option value="review">',
  '<option value="decisionlog">',
  '<option selected="" value="mvp">',
  'function getModeInstruction(mode)',
  'NEXT CHAT HANDOFF'
];

for (const marker of forbidden) {
  if (html.includes(marker)) throw new Error(`AT-02 legacy runtime responsibility remains: ${marker}`);
}

console.log("AT-02 index verification passed.");
