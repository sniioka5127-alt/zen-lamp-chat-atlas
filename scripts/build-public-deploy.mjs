import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outRoot = path.join(repoRoot, "artifacts", "chat-atlas-at03-public-deploy");

const sourceFiles = [
  "index.html",
  "chat-atlas/browser-runtime.js",
  "chat-atlas/project-binding.js"
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function assertSourceContract() {
  const index = await fsp.readFile(path.join(repoRoot, "index.html"), "utf8");
  const binding = await fsp.readFile(path.join(repoRoot, "chat-atlas/project-binding.js"), "utf8");

  if (!index.includes('<script src="./chat-atlas/browser-runtime.js"></script>')) {
    throw new Error("index.html is missing the Chat Atlas browser runtime reference");
  }
  if (!index.includes('<script src="./chat-atlas/project-binding.js"></script>')) {
    throw new Error("index.html is missing the AT-03 project binding reference");
  }
  for (const marker of [
    "ATLAS_PROJECT_BINDING_VERSION",
    "human_project_reference",
    "project_store_verification"
  ]) {
    if (!binding.includes(marker)) throw new Error(`project-binding.js is missing ${marker}`);
  }
  if (/\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon/i.test(binding)) {
    throw new Error("project-binding.js must not contain provider/network transport code");
  }
}

async function main() {
  await assertSourceContract();
  await fsp.rm(outRoot, { recursive: true, force: true });
  await fsp.mkdir(path.join(outRoot, "chat-atlas"), { recursive: true });

  const files = [];
  for (const relative of sourceFiles) {
    const sourcePath = path.join(repoRoot, relative);
    const targetPath = path.join(outRoot, relative);
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    const content = await fsp.readFile(sourcePath);
    await fsp.writeFile(targetPath, content);
    files.push({
      path: relative,
      bytes: content.length,
      sha256: sha256(content)
    });
  }

  const manifest = {
    schema_version: "0.1",
    deployment: "AT-03 Public Chat Atlas Deployment",
    target_url: "https://zen-lamp.com/tools/chat-atlas/",
    target_directory_hint: "/tools/chat-atlas/",
    source_repository: "sniioka5127-alt/zen-lamp-chat-atlas",
    source_commit: process.env.GITHUB_SHA || "local-build",
    generated_at: new Date().toISOString(),
    overwrite_policy: "Replace index.html and chat-atlas/browser-runtime.js; add or replace chat-atlas/project-binding.js. Preserve unrelated site/root assets.",
    files
  };

  await fsp.writeFile(
    path.join(outRoot, "DEPLOYMENT_MANIFEST.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(`AT-03 public deployment bundle ready: ${outRoot}`);
  for (const file of files) console.log(`${file.sha256}  ${file.path}`);
}

await main();
