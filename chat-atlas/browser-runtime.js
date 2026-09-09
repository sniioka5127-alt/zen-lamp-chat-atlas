// HIRAKU Tools — Chat Atlas AT-02
// Classic-script browser runtime bridge. No module loader required.

(function attachChatAtlasAT02(global) {
  "use strict";

  const ATLAS_CONTRACT_VERSION = "at-01";
  const CONTEXT_KIND = Object.freeze([
    "fact",
    "decision",
    "constraint",
    "project_context",
    "style_anchor",
    "discovery",
    "question",
    "hypothesis",
    "temporary",
    "avoid",
    "evidence_reference"
  ]);
  const ATLAS_MARKER = Object.freeze([
    "fact",
    "decision",
    "constraint",
    "question",
    "hypothesis",
    "discovery",
    "turning_point",
    "unresolved",
    "boundary_risk",
    "evidence"
  ]);
  const ACTOR_TYPE = Object.freeze(["human", "ai", "document", "unknown"]);

  function assertRequiredString(value, name) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(`${name} must be a non-empty string`);
    }
    return value.trim();
  }

  function safeEnum(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function normalizeRole(role) {
    if (!role) return "unknown";
    if (role === "assistant") return "Assistant";
    if (role === "user") return "User";
    if (role === "system") return "System";
    if (role === "tool") return "Tool";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function extractMessageText(message) {
    if (!message || !message.content) return "";
    const content = message.content;
    if (Array.isArray(content.parts)) {
      return content.parts.map(part => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          if (typeof part.text === "string") return part.text;
          if (typeof part.content === "string") return part.content;
          return JSON.stringify(part);
        }
        return String(part ?? "");
      }).join("\n").trim();
    }
    if (typeof content.text === "string") return content.text.trim();
    if (Array.isArray(content.text)) return content.text.join("\n").trim();
    if (typeof content === "string") return content.trim();
    return "";
  }

  function nodeMessageTime(node) {
    const t = node?.message?.create_time;
    return typeof t === "number" && Number.isFinite(t) ? t : 0;
  }

  function buildPathToRoot(mapping, leafId) {
    const path = [];
    const seen = new Set();
    let id = leafId;
    while (id && mapping[id] && !seen.has(id)) {
      seen.add(id);
      path.push(id);
      id = mapping[id]?.parent || null;
    }
    path.reverse();
    return path;
  }

  function getLeafIds(mapping) {
    const ids = Object.keys(mapping || {});
    const parentIds = new Set();
    for (const node of Object.values(mapping || {})) {
      if (node?.parent) parentIds.add(node.parent);
    }
    return ids.filter(id => !parentIds.has(id));
  }

  function chooseFallbackLeaf(mapping) {
    const leaves = getLeafIds(mapping);
    if (!leaves.length) return null;
    const ranked = leaves.map(id => {
      const path = buildPathToRoot(mapping, id);
      let latest = 0;
      for (const nodeId of path) latest = Math.max(latest, nodeMessageTime(mapping[nodeId]));
      return { id, depth: path.length, latest };
    });
    ranked.sort((a, b) => (b.depth - a.depth) || (b.latest - a.latest) || a.id.localeCompare(b.id));
    return ranked[0]?.id || null;
  }

  function extractActiveBranch(conv = {}) {
    const mapping = conv.mapping || {};
    const leaves = getLeafIds(mapping);
    const currentNode = conv.current_node && mapping[conv.current_node]
      ? conv.current_node
      : null;
    const leafId = currentNode || chooseFallbackLeaf(mapping);
    const pathIds = leafId ? buildPathToRoot(mapping, leafId) : [];
    const messages = pathIds
      .map(nodeId => {
        const msg = mapping[nodeId]?.message;
        if (!msg || !msg.author || msg.author.role === "system") return null;
        const text = extractMessageText(msg);
        if (!text) return null;
        return {
          node_id: nodeId,
          id: msg.id || "",
          role: normalizeRole(msg.author.role),
          rawRole: msg.author.role,
          create_time: msg.create_time || 0,
          text
        };
      })
      .filter(Boolean);
    return {
      messages,
      path_ids: pathIds,
      selected_leaf_id: leafId,
      branch_mode: currentNode ? "current_node" : "deepest_leaf_fallback",
      leaf_count: leaves.length,
      alternative_branch_count: Math.max(0, leaves.length - (leafId ? 1 : 0))
    };
  }

  function parseChatGPTConversationsBranchAware(rawJson) {
    const arr = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
    if (!Array.isArray(arr)) throw new Error("conversations.json is not an array.");
    return arr.map((conv, index) => {
      const branch = extractActiveBranch(conv);
      return {
        index,
        id: conv.id || String(index),
        title: conv.title || `Untitled ${index + 1}`,
        create_time: conv.create_time || 0,
        update_time: conv.update_time || conv.create_time || 0,
        messages: branch.messages,
        messageCount: branch.messages.length,
        branch,
        source: "ChatGPT"
      };
    }).filter(c => c.messages.length > 0);
  }

  function normalizeSource(source = {}) {
    return {
      actor_type: safeEnum(source.actor_type || "unknown", ACTOR_TYPE, "unknown"),
      actor_name: source.actor_name ?? null,
      platform: source.platform ?? null,
      model: source.model ?? null,
      conversation_id: source.conversation_id ?? null,
      document_id: source.document_id ?? null,
      timestamp: source.timestamp ?? null
    };
  }

  function normalizeProvenance(provenance = {}) {
    return {
      original_text: provenance.original_text ?? null,
      source_refs: Array.isArray(provenance.source_refs)
        ? [...provenance.source_refs].map(String)
        : []
    };
  }

  function languageInstruction(language) {
    const map = {
      same: "Write natural-language fields in the same main language as the conversation.",
      en: "Write natural-language fields in English.",
      ja: "Write natural-language fields in Japanese.",
      zh: "Write natural-language fields in Chinese.",
      ko: "Write natural-language fields in Korean.",
      both: "Write natural-language fields in English first and add concise Japanese where useful."
    };
    return map[language] || map.same;
  }

  function targetInstruction(target) {
    const map = {
      generic: "Use a balanced, provider-neutral analytical style.",
      gpt: "Prefer concise hierarchy, explicit decisions, and implementation-relevant distinctions.",
      gemini: "Notice adjacent ideas and cross-domain connections, but label speculation clearly.",
      claude: "Pay special attention to boundaries, contradictions, overclaims, and unresolved uncertainty."
    };
    return map[target] || map.generic;
  }

  function modeInstruction(mode) {
    const map = {
      producer: "Prioritize high-value ContextItem candidates across the whole conversation.",
      thinking: "Prioritize shifts in framing, turning points, hypotheses, unresolved questions, and discoveries.",
      decisions: "Prioritize explicit and implied decisions, constraints, alternatives, evidence, and remaining uncertainty.",
      full: "Map the whole conversation, but only emit reusable ContextItem candidates when they materially help future understanding."
    };
    return map[mode] || map.producer;
  }

  function buildAtlasProducerPrompt({
    title = "Selected conversation",
    conversation,
    promptType = "withText",
    mode = "producer",
    language = "same",
    target = "generic",
    includeAnchors = true,
    includeRisks = true,
    includeNext = true,
    includeQuotes = false
  } = {}) {
    const text = promptType === "withText"
      ? assertRequiredString(conversation, "conversation")
      : String(conversation || "").trim();
    const conversationBlock = promptType === "withText"
      ? `Conversation:\n\"\"\"\n${text}\n\"\"\"`
      : "Conversation:\nPaste the selected conversation below this line before running the prompt.";
    const optional = [];
    if (includeAnchors) optional.push("- Preserve useful anchors and source_refs that help locate the relevant turn again.");
    if (includeRisks) optional.push("- Identify topic-mixing or project-boundary risks as boundary_risk markers.");
    if (includeNext) optional.push("- Preserve unresolved questions or review points, but do not turn them into final decisions.");
    if (includeQuotes) optional.push("- Use only short representative original_text excerpts when they materially improve provenance.");
    if (!optional.length) optional.push("- Keep the candidate set selective and navigable.");

    return `You are Chat Atlas, Room 1 of a Human Agency workspace.\n\nYour responsibility is to SEE and MAP what happened in the conversation.\nYou are a ContextItem producer, not a Memory Curator and not a Context Bridge.\n\nCore principle:\nA document can be summarized, but a thinking process needs to be mapped.\n\nHuman Authority rules:\n- You may propose ContextItem candidates.\n- You may NOT approve, reject, keep, drop, or persist memory.\n- You may NOT decide transfer policy.\n- You may NOT generate a Next Chat Handoff or provider-specific handoff.\n- Do not invent facts, decisions, or certainty that are not present.\n- Separate human statements, AI suggestions, document evidence, and inference whenever possible.\n- Preserve conflicts instead of silently resolving them.\n\nProject / conversation title: ${title}\nMode: ${mode}\n\nAnalysis focus:\n${modeInstruction(mode)}\n\nTarget style:\n${targetInstruction(target)}\n\nLanguage:\n${languageInstruction(language)}\n\nAdditional requirements:\n${optional.join("\n")}\n\nReturn exactly one JSON code block with this shape:\n\n\`\`\`json\n{\n  \"contract_version\": \"${ATLAS_CONTRACT_VERSION}\",\n  \"conversation_summary\": \"one short navigational summary\",\n  \"context_items\": [\n    {\n      \"content\": \"one atomic candidate\",\n      \"kind\": \"fact | decision | constraint | project_context | style_anchor | discovery | question | hypothesis | temporary | avoid | evidence_reference\",\n      \"atlas_marker\": \"fact | decision | constraint | question | hypothesis | discovery | turning_point | unresolved | boundary_risk | evidence\",\n      \"source\": {\n        \"actor_type\": \"human | ai | document | unknown\",\n        \"actor_name\": null,\n        \"platform\": null,\n        \"model\": null,\n        \"conversation_id\": null,\n        \"document_id\": null,\n        \"timestamp\": null\n      },\n      \"provenance\": {\n        \"original_text\": null,\n        \"source_refs\": []\n      },\n      \"rationale\": \"why this candidate helps reconstruct or navigate the thinking process\",\n      \"confidence_note\": null\n    }\n  ],\n  \"turning_points\": [],\n  \"conflicts\": [],\n  \"unresolved_questions\": [],\n  \"boundary_risks\": []\n}\n\`\`\`\n\nStrict field rules:\n- Do NOT output status, human_review, approved_at, approved_by, memory_policy, or transfer_policy.\n- ContextItem candidates remain proposals until a human reviews them elsewhere.\n- Prefer atomic items over paragraphs.\n- Distinguish an actual human decision from an AI recommendation.\n- If a decision is only proposed or discussed, use hypothesis, question, or discovery instead of decision.\n- Keep source_refs compact and useful.\n- Keep original_text short and only when it materially improves provenance.\n\n${conversationBlock}`;
  }

  function extractJsonObject(text) {
    const raw = assertRequiredString(text, "AI result");
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : raw.trim();
    try {
      return JSON.parse(candidate);
    } catch (error) {
      throw new Error(`Could not parse Chat Atlas JSON: ${error.message}`);
    }
  }

  function normalizeAtlasCandidate(candidate = {}) {
    const content = assertRequiredString(candidate.content, "context item content");
    const kind = safeEnum(candidate.kind, CONTEXT_KIND, "discovery");
    const atlas_marker = safeEnum(
      candidate.atlas_marker,
      ATLAS_MARKER,
      kind === "question" ? "question" : "discovery"
    );
    return {
      content,
      kind,
      atlas_marker,
      source: normalizeSource(candidate.source || {}),
      provenance: normalizeProvenance(candidate.provenance || {}),
      rationale: candidate.rationale == null ? null : String(candidate.rationale),
      confidence_note: candidate.confidence_note == null ? null : String(candidate.confidence_note)
    };
  }

  function parseAtlasResponse(text) {
    const parsed = extractJsonObject(text);
    if (!Array.isArray(parsed.context_items)) {
      throw new TypeError("Chat Atlas output must contain context_items[]");
    }
    return {
      contract_version: parsed.contract_version || null,
      conversation_summary: parsed.conversation_summary == null ? null : String(parsed.conversation_summary),
      context_items: parsed.context_items.map(normalizeAtlasCandidate),
      turning_points: Array.isArray(parsed.turning_points) ? parsed.turning_points : [],
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
      unresolved_questions: Array.isArray(parsed.unresolved_questions) ? parsed.unresolved_questions : [],
      boundary_risks: Array.isArray(parsed.boundary_risks) ? parsed.boundary_risks : []
    };
  }

  function toPortableContextItem(candidate, {
    projectId = null,
    conversationId = null,
    defaultPlatform = null
  } = {}) {
    const normalized = normalizeAtlasCandidate(candidate);
    const source = {
      ...normalized.source,
      conversation_id: normalized.source.conversation_id ?? conversationId,
      platform: normalized.source.platform ?? defaultPlatform
    };
    const item = {
      content: normalized.content,
      kind: normalized.kind,
      source,
      provenance: {
        ...normalized.provenance,
        derived: true,
        derived_by: "chat_atlas"
      },
      memory_policy: "review",
      transfer_policy: "manual_only",
      freshness: {
        state: "current",
        review_after: null,
        reason: null
      },
      atlas: {
        marker: normalized.atlas_marker,
        rationale: normalized.rationale,
        confidence_note: normalized.confidence_note
      }
    };
    if (projectId) item.project_id = String(projectId);
    return item;
  }

  global.ChatAtlasAT02 = Object.freeze({
    ATLAS_CONTRACT_VERSION,
    extractActiveBranch,
    parseChatGPTConversationsBranchAware,
    buildAtlasProducerPrompt,
    parseAtlasResponse,
    toPortableContextItem
  });
})(typeof window !== "undefined" ? window : globalThis);
