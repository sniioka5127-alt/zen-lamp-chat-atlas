import fs from "node:fs/promises";

const path = new URL("../index.html", import.meta.url);
let html = await fs.readFile(path, "utf8");

if (html.includes('data-at02="browser-runtime-integrated"')) {
  console.log("AT-02 index integration already applied.");
  process.exit(0);
}

function replaceOrThrow(search, replacement, label) {
  const next = typeof search === "string"
    ? html.replace(search, replacement)
    : html.replace(search, replacement);
  if (next === html) throw new Error(`AT-02 patch failed: ${label}`);
  html = next;
}

html = html.replaceAll("v1.2", "v1.3");
html = html.replaceAll("Memory Governance", "ContextItem Producer");
html = html.replaceAll("Next Chat Review Map", "Full Conversation Map");
replaceOrThrow("<body>", '<body data-at02="browser-runtime-integrated">', "body marker");
replaceOrThrow(
  "Load ChatGPT conversations.json, paste any AI log manually, or import .txt / .md files from Claude, Gemini, or other AIs — then turn them into Thinking Timeline, Decision Log, and ContextItem Producer prompts.",
  "Load ChatGPT conversations.json, paste any AI log manually, or import .txt / .md files from Claude, Gemini, or other AIs — then map the selected conversation into proposed ContextItems for human review.",
  "hero subtitle"
);

replaceOrThrow(
  /<select id="modeSelect">[\s\S]*?<\/select>/,
  `<select id="modeSelect">
<option selected="" value="producer">ContextItem Producer</option>
<option value="thinking">Thinking Map</option>
<option value="decisions">Decision Map</option>
<option value="full">Full Conversation Map</option>
</select>`,
  "mode options"
);

html = html.replaceAll("3. Generate Index Prompt", "3. Generate Atlas Producer Prompt");
html = html.replaceAll(
  "Create a copy-paste prompt for ChatGPT, Gemini, Claude, or another AI.",
  "Create a copy-paste Chat Atlas producer prompt. The AI may propose ContextItems, but cannot approve memory or decide transfer policy."
);

replaceOrThrow(
  /<div class="card-body">\s*<div class="row">\s*<div class="field">\s*<label for="modeSelect">Mode<\/label>/,
  `<div class="card-body">
<div class="field">
<label for="projectIdInput">Project ID (optional)</label>
<input id="projectIdInput" placeholder="e.g. prj_hiraku_tools"/>
<div class="hint">If left blank, the exported candidates remain portable and can be assigned to a project later.</div>
</div>
<div class="row">
<div class="field">
<label for="modeSelect">Mode</label>`,
  "project field"
);

replaceOrThrow(
  `<div class="status" id="promptStatus">Ready.</div>
</div>
</section>`,
  `<div class="status" id="promptStatus">Ready.</div>
<div class="field at02-review">
<label for="atlasResultInput">AI Atlas result</label>
<textarea id="atlasResultInput" placeholder="Paste the JSON response returned by the AI here..."></textarea>
</div>
<div class="actions">
<button class="primary" id="parseAtlasResultBtn" type="button">Parse proposed ContextItems</button>
<button class="secondary" id="copyContextItemsBtn" type="button">Copy ContextItems</button>
<button class="secondary" id="downloadContextItemsBtn" type="button">Download ContextItems JSON</button>
</div>
<div class="field">
<label for="contextItemsOutput">Proposed ContextItems JSON</label>
<textarea id="contextItemsOutput" placeholder="Parsed proposal-only ContextItems will appear here..." readonly=""></textarea>
</div>
<div class="status" id="candidateStatus">No AI result parsed yet.</div>
<div class="hint at02-boundary"><strong>Boundary:</strong> Chat Atlas only proposes. Memory Curator decides what remains. Context Bridge decides what travels. Human approval remains required.</div>
</div>
</section>`,
  "AT-02 review UI"
);

replaceOrThrow(
  `#promptOutput {
      min-height: 560px;
      font-family: var(--mono);
      font-size: .80rem;
      background: #fffdfa;
    }`,
  `#promptOutput {
      min-height: 460px;
      font-family: var(--mono);
      font-size: .80rem;
      background: #fffdfa;
    }

    #atlasResultInput, #contextItemsOutput {
      min-height: 210px;
      font-family: var(--mono);
      font-size: .78rem;
    }

    #contextItemsOutput { background: #fffdfa; }
    .at02-boundary { border-left: 3px solid var(--accent); padding-left: 10px; }`,
  "AT-02 styles"
);

replaceOrThrow(
  `<script>
    const $ = (id) => document.getElementById(id);`,
  `<script src="./chat-atlas/browser-runtime.js"></script>
<script>
    const $ = (id) => document.getElementById(id);`,
  "browser runtime script"
);

replaceOrThrow(
  /    function parseChatGPTConversations\(rawJson\) \{[\s\S]*?\n    \}\n\n    function formatConversationText/,
  `    function parseChatGPTConversations(rawJson) {
      if (!window.ChatAtlasAT02) throw new Error("Chat Atlas AT-02 runtime is unavailable.");
      return window.ChatAtlasAT02.parseChatGPTConversationsBranchAware(rawJson).map(c => {
        const formatted = formatConversationText(c);
        const branch = c.branch || {};
        const branchMeta = [
          "Source: ChatGPT",
          \`Branch mode: \${branch.branch_mode || "unknown"}\`,
          \`Alternative branches excluded: \${branch.alternative_branch_count || 0}\`
        ].join("\\n");
        const text = branchMeta + "\\n\\n" + formatted;
        return { ...c, text, charCount: text.length, source: "ChatGPT" };
      });
    }

    function formatConversationText`,
  "branch-aware parser wiring"
);

replaceOrThrow(
  /    function getModeInstruction\(mode\) \{[\s\S]*?\n    \}\n\n    function getTargetInstruction/,
  `    function getTargetInstruction`,
  "remove legacy mode authority"
);

replaceOrThrow(
  /    function generatePrompt\(\) \{[\s\S]*?\n    \}\n\n    async function copyText/,
  `    function generatePrompt() {
      const chatText = $("chatText").value.trim();
      const title = $("selectedTitle").value.trim() || "Selected conversation";
      const promptType = $("promptTypeSelect").value;

      if (promptType === "withText" && !chatText) {
        setStatus($("promptStatus"), currentT("statusSelectOrPaste"), "bad");
        return;
      }
      if (!window.ChatAtlasAT02) {
        setStatus($("promptStatus"), "AT-02 runtime is unavailable.", "bad");
        return;
      }

      try {
        $("promptOutput").value = window.ChatAtlasAT02.buildAtlasProducerPrompt({
          title,
          conversation: chatText,
          promptType,
          mode: $("modeSelect").value,
          language: $("languageSelect").value,
          target: $("targetSelect").value,
          includeAnchors: $("includeAnchors").checked,
          includeRisks: $("includeRisks").checked,
          includeNext: $("includeNext").checked,
          includeQuotes: $("includeQuotes").checked
        });
        setStatus($("promptStatus"), "Atlas producer prompt generated. ContextItems remain proposals only.", "ok");
      } catch (err) {
        setStatus($("promptStatus"), err.message || String(err), "bad");
      }
    }

    function clearAT02Outputs() {
      const input = $("atlasResultInput");
      const output = $("contextItemsOutput");
      const status = $("candidateStatus");
      if (input) input.value = "";
      if (output) output.value = "";
      if (status) setStatus(status, "No AI result parsed yet.");
    }

    function buildContextItemEnvelope(parsed) {
      const projectId = $("projectIdInput") ? $("projectIdInput").value.trim() : "";
      const conversationId = selectedConversation?.id || null;
      const platform = selectedConversation?.source || "Generic AI";
      const seen = new Set();
      const contextItems = [];
      for (const candidate of parsed.context_items) {
        const item = window.ChatAtlasAT02.toPortableContextItem(candidate, {
          projectId: projectId || null,
          conversationId,
          defaultPlatform: platform
        });
        const key = \`\${item.kind}::\${item.content.trim().toLowerCase()}\`;
        if (seen.has(key)) continue;
        seen.add(key);
        contextItems.push(item);
      }
      return {
        schema_version: "0.1",
        producer: "chat_atlas",
        producer_contract: parsed.contract_version || window.ChatAtlasAT02.ATLAS_CONTRACT_VERSION,
        intended_state: "proposed",
        project_id: projectId || null,
        conversation: {
          id: conversationId,
          title: $("selectedTitle").value.trim() || null,
          source: platform,
          branch: selectedConversation?.branch || null
        },
        conversation_summary: parsed.conversation_summary,
        context_items: contextItems,
        map: {
          turning_points: parsed.turning_points,
          conflicts: parsed.conflicts,
          unresolved_questions: parsed.unresolved_questions,
          boundary_risks: parsed.boundary_risks
        },
        human_authority: {
          memory_decision: "memory_curator",
          transfer_decision: "context_bridge",
          final_approval: "human_gate"
        }
      };
    }

    function parseAtlasResult() {
      const raw = $("atlasResultInput").value.trim();
      if (!raw) {
        setStatus($("candidateStatus"), "Paste the AI Atlas JSON result first.", "bad");
        return;
      }
      try {
        const parsed = window.ChatAtlasAT02.parseAtlasResponse(raw);
        const envelope = buildContextItemEnvelope(parsed);
        $("contextItemsOutput").value = JSON.stringify(envelope, null, 2);
        setStatus(
          $("candidateStatus"),
          \`Parsed \${envelope.context_items.length} proposed ContextItems. Nothing has been approved or transferred.\`,
          "ok"
        );
      } catch (err) {
        $("contextItemsOutput").value = "";
        setStatus($("candidateStatus"), err.message || String(err), "bad");
      }
    }

    async function copyText`,
  "producer prompt and candidate parser"
);

html = html.replaceAll(
  `      $("promptOutput").value = "";`,
  `      $("promptOutput").value = "";\n      clearAT02Outputs();`
);

replaceOrThrow(
  `      $("chatText").value = c.text;
      updateStats();`,
  `      $("chatText").value = c.text;
      clearAT02Outputs();
      updateStats();`,
  "clear proposal on conversation switch"
);

replaceOrThrow(
  `    $("downloadPromptBtn").addEventListener("click", () => downloadText(\`conversation-index-prompt-\${safeFileName($("selectedTitle").value)}.txt\`, $("promptOutput").value, $("promptStatus")));`,
  `    $("downloadPromptBtn").addEventListener("click", () => downloadText(\`chat-atlas-producer-prompt-\${safeFileName($("selectedTitle").value)}.txt\`, $("promptOutput").value, $("promptStatus")));
    $("parseAtlasResultBtn").addEventListener("click", parseAtlasResult);
    $("copyContextItemsBtn").addEventListener("click", () => copyText($("contextItemsOutput").value, $("candidateStatus"), "Proposed ContextItems copied."));
    $("downloadContextItemsBtn").addEventListener("click", () => downloadText(\`chat-atlas-contextitems-\${safeFileName($("selectedTitle").value)}.json\`, $("contextItemsOutput").value, $("candidateStatus")));`,
  "AT-02 event handlers"
);

replaceOrThrow(
  `    const manualI18n = {`,
  `    const at02I18n = {
      en: {
        hPrompt: "3. Generate Atlas Producer Prompt",
        pPrompt: "Map the selected conversation into proposal-only ContextItems. Approval belongs to the human review flow.",
        projectId: "Project ID (optional)",
        projectHelp: "Leave blank to export portable candidates that can be assigned later.",
        result: "AI Atlas result",
        parse: "Parse proposed ContextItems",
        copy: "Copy ContextItems",
        download: "Download ContextItems JSON",
        output: "Proposed ContextItems JSON",
        boundary: "Boundary: Chat Atlas only proposes. Memory Curator decides what remains. Context Bridge decides what travels. Human approval remains required.",
        modeProducer: "ContextItem Producer",
        modeThinking: "Thinking Map",
        modeDecisions: "Decision Map",
        modeFull: "Full Conversation Map",
        workflow3Title: "3. Map into proposals",
        workflow3Text: "Generate an Atlas producer prompt, then parse the AI result into proposal-only ContextItems for human review."
      },
      ja: {
        hPrompt: "3. Atlas Producerプロンプトを生成",
        pPrompt: "選択した会話を、承認前のContextItem候補として地図化します。承認は人間のレビュー工程で行います。",
        projectId: "Project ID（任意）",
        projectHelp: "空欄なら、後からProjectへ割り当てられる移植可能な候補として出力します。",
        result: "AI Atlas結果",
        parse: "ContextItem候補を解析",
        copy: "ContextItemsをコピー",
        download: "ContextItems JSONを保存",
        output: "提案ContextItems JSON",
        boundary: "境界：Chat Atlasは候補を提示するだけです。何を残すかはMemory Curator、何を渡すかはContext Bridge、人間の承認はHuman Gateが担当します。",
        modeProducer: "ContextItem Producer",
        modeThinking: "Thinking Map（思考地図）",
        modeDecisions: "Decision Map（判断地図）",
        modeFull: "Full Conversation Map（完全地図）",
        workflow3Title: "3. 候補として地図化する",
        workflow3Text: "Atlas Producerプロンプトを生成し、AI結果を未承認のContextItem候補として解析します。"
      },
      zh: {
        hPrompt: "3. 生成 Atlas Producer 提示词",
        pPrompt: "把所选对话映射为仅供提议的 ContextItem；批准权保留在人类审核流程中。",
        projectId: "Project ID（可选）",
        projectHelp: "留空即可导出可移植、稍后再分配项目的候选项。",
        result: "AI Atlas 结果",
        parse: "解析 ContextItem 候选",
        copy: "复制 ContextItems",
        download: "下载 ContextItems JSON",
        output: "提议的 ContextItems JSON",
        boundary: "边界：Chat Atlas 只提出候选；Memory Curator 决定保留什么；Context Bridge 决定传递什么；最终仍需人工批准。",
        modeProducer: "ContextItem Producer",
        modeThinking: "Thinking Map",
        modeDecisions: "Decision Map",
        modeFull: "Full Conversation Map",
        workflow3Title: "3. 映射为候选项",
        workflow3Text: "生成 Atlas Producer 提示词，并把 AI 结果解析为等待人工审核的 ContextItem 候选。"
      },
      ko: {
        hPrompt: "3. Atlas Producer 프롬프트 생성",
        pPrompt: "선택한 대화를 승인 전 ContextItem 후보로 지도화합니다. 승인은 사람의 검토 흐름에 남습니다.",
        projectId: "Project ID (선택)",
        projectHelp: "비워두면 나중에 프로젝트에 배정할 수 있는 이동 가능한 후보로 내보냅니다.",
        result: "AI Atlas 결과",
        parse: "ContextItem 후보 분석",
        copy: "ContextItems 복사",
        download: "ContextItems JSON 저장",
        output: "제안 ContextItems JSON",
        boundary: "경계: Chat Atlas는 후보만 제안합니다. 무엇을 남길지는 Memory Curator, 무엇을 전달할지는 Context Bridge가 다루며 최종 승인은 사람에게 남습니다.",
        modeProducer: "ContextItem Producer",
        modeThinking: "Thinking Map",
        modeDecisions: "Decision Map",
        modeFull: "Full Conversation Map",
        workflow3Title: "3. 후보로 지도화",
        workflow3Text: "Atlas Producer 프롬프트를 만들고 AI 결과를 사람 검토 전 ContextItem 후보로 분석합니다."
      }
    };

    const manualI18n = {`,
  "AT-02 i18n"
);

replaceOrThrow(
  /      const modeOptions = \$\("modeSelect"\)\.options;[\s\S]*?      if \(modeOptions\[6\]\) modeOptions\[6\]\.textContent = t\.modeReview;\n/,
  `      const modeOptions = $("modeSelect").options;
      const at02 = at02I18n[lang] || at02I18n.en;
      if (modeOptions[0]) modeOptions[0].textContent = at02.modeProducer;
      if (modeOptions[1]) modeOptions[1].textContent = at02.modeThinking;
      if (modeOptions[2]) modeOptions[2].textContent = at02.modeDecisions;
      if (modeOptions[3]) modeOptions[3].textContent = at02.modeFull;
`,
  "AT-02 mode i18n"
);

replaceOrThrow(
  `      localStorage.setItem("zenLampChatAtlasUiLang", lang);`,
  `      const at02 = at02I18n[lang] || at02I18n.en;
      if (headers[2]) headers[2].textContent = at02.hPrompt;
      if (paras[2]) paras[2].textContent = at02.pPrompt;
      if (workflowCards[2]) workflowCards[2].innerHTML = \`<strong>\${at02.workflow3Title}</strong><p>\${at02.workflow3Text}</p>\`;
      const projectLabel = document.querySelector('label[for="projectIdInput"]');
      if (projectLabel) projectLabel.textContent = at02.projectId;
      const projectHelp = $("projectIdInput")?.nextElementSibling;
      if (projectHelp) projectHelp.textContent = at02.projectHelp;
      const resultLabel = document.querySelector('label[for="atlasResultInput"]');
      if (resultLabel) resultLabel.textContent = at02.result;
      const outputLabel = document.querySelector('label[for="contextItemsOutput"]');
      if (outputLabel) outputLabel.textContent = at02.output;
      if ($("parseAtlasResultBtn")) $("parseAtlasResultBtn").textContent = at02.parse;
      if ($("copyContextItemsBtn")) $("copyContextItemsBtn").textContent = at02.copy;
      if ($("downloadContextItemsBtn")) $("downloadContextItemsBtn").textContent = at02.download;
      const boundary = document.querySelector(".at02-boundary");
      if (boundary) boundary.textContent = at02.boundary;
      localStorage.setItem("zenLampChatAtlasUiLang", lang);`,
  "AT-02 apply i18n"
);

await fs.writeFile(path, html, "utf8");
console.log("AT-02 browser runtime integration applied to index.html.");
