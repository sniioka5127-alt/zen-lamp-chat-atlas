// HIRAKU Tools — Chat Atlas AT-01
// Runtime-neutral ContextItem producer contract.

export const ATLAS_CONTRACT_VERSION = "at-01";

export const CONTEXT_KIND = Object.freeze([
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

export const ATLAS_MARKER = Object.freeze([
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

export const ACTOR_TYPE = Object.freeze([
  "human",
  "ai",
  "document",
  "unknown"
]);

function assertRequiredString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function safeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
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

export function buildAtlasProducerPrompt({
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

  return `You are Chat Atlas, Room 1 of a Human Agency workspace.

Your responsibility is to SEE and MAP what happened in the conversation.
You are a ContextItem producer, not a Memory Curator and not a Context Bridge.

Core principle:
A document can be summarized, but a thinking process needs to be mapped.

Human Authority rules:
- You may propose ContextItem candidates.
- You may NOT approve, reject, keep, drop, or persist memory.
- You may NOT decide transfer policy.
- You may NOT generate a Next Chat Handoff or provider-specific handoff.
- Do not invent facts, decisions, or certainty that are not present.
- Separate human statements, AI suggestions, document evidence, and inference whenever possible.
- Preserve conflicts instead of silently resolving them.

Project / conversation title: ${title}
Mode: ${mode}

Analysis focus:
${modeInstruction(mode)}

Target style:
${targetInstruction(target)}

Language:
${languageInstruction(language)}

Additional requirements:
${optional.join("\n")}

Return exactly one JSON code block. The JSON must use this shape:

\`\`\`json
{
  "contract_version": "${ATLAS_CONTRACT_VERSION}",
  "conversation_summary": "one short navigational summary, not a replacement for the map",
  "context_items": [
    {
      "content": "one atomic candidate",
      "kind": "fact | decision | constraint | project_context | style_anchor | discovery | question | hypothesis | temporary | avoid | evidence_reference",
      "atlas_marker": "fact | decision | constraint | question | hypothesis | discovery | turning_point | unresolved | boundary_risk | evidence",
      "source": {
        "actor_type": "human | ai | document | unknown",
        "actor_name": null,
        "platform": null,
        "model": null,
        "conversation_id": null,
        "document_id": null,
        "timestamp": null
      },
      "provenance": {
        "original_text": null,
        "source_refs": []
      },
      "rationale": "why this candidate helps reconstruct or navigate the thinking process",
      "confidence_note": null
    }
  ],
  "turning_points": [],
  "conflicts": [],
  "unresolved_questions": [],
  "boundary_risks": []
}
\`\`\`

Strict field rules:
- Do NOT output status, human_review, approved_at, approved_by, memory_policy, or transfer_policy.
- ContextItem candidates remain proposals until a human reviews them elsewhere.
- Prefer atomic items over paragraphs.
- Distinguish an actual human decision from an AI recommendation.
- If a decision is only proposed or discussed, use hypothesis, question, or discovery instead of decision.
- Keep source_refs compact and useful. If exact turn identifiers are unavailable, use approximate anchors such as \"User turn near: <short phrase>\".
- Keep original_text short and only when it materially improves provenance.

${conversationBlock}`;
}

export function extractJsonObject(text) {
  const raw = assertRequiredString(text, "AI result");
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw.trim();
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new Error(`Could not parse Chat Atlas JSON: ${error.message}`);
  }
}

export function normalizeAtlasCandidate(candidate = {}) {
  const content = assertRequiredString(candidate.content, "context item content");
  const kind = safeEnum(candidate.kind, CONTEXT_KIND, "discovery");
  const atlas_marker = safeEnum(candidate.atlas_marker, ATLAS_MARKER, kind === "question" ? "question" : "discovery");

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

export function parseAtlasResponse(text) {
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

export function toPortableContextItem(candidate, {
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
