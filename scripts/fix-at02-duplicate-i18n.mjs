import fs from "node:fs/promises";

const path = new URL("../index.html", import.meta.url);
let html = await fs.readFile(path, "utf8");
const needle = '      const at02 = at02I18n[lang] || at02I18n.en;';
const first = html.indexOf(needle);
if (first < 0) throw new Error("AT-02 fixer: first at02 declaration not found");
const second = html.indexOf(needle, first + needle.length);
if (second < 0) {
  console.log("AT-02 fixer: duplicate declaration already removed.");
  process.exit(0);
}
const third = html.indexOf(needle, second + needle.length);
if (third >= 0) throw new Error("AT-02 fixer: unexpected third at02 declaration found");
html = html.slice(0, second) + '      // Reuse the AT-02 translation object declared above.' + html.slice(second + needle.length);
await fs.writeFile(path, html, "utf8");
console.log("AT-02 fixer: removed duplicate at02 declaration.");
