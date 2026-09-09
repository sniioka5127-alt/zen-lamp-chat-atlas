# AT-02｜Chat Atlas Browser Runtime Integration v0.1

## Purpose

AT-02 connects the public Chat Atlas browser UI to the AT-01 ContextItem Producer contract.

The browser runtime must preserve the Room 1 boundary:

> Chat Atlas sees and maps. It does not decide what becomes memory and does not decide what travels.

## Browser flow

1. Load or paste a conversation locally.
2. Select and review the conversation text.
3. Generate an AT-01 Atlas Producer prompt.
4. Paste the prompt into an AI chosen by the user.
5. Paste the returned Atlas JSON back into Chat Atlas.
6. Parse the response into proposal-only portable ContextItems.
7. Export or copy the ContextItem envelope for later Human Agency Core / Memory Curator intake.

No external AI API is called by Chat Atlas in AT-02.

## Runtime files

- `index.html` — v1.3 browser UI
- `chat-atlas/browser-runtime.js` — classic-script runtime bridge for AT-01 functions
- `chat-atlas/producer.mjs` — reference producer contract
- `chat-atlas/chatgpt-branch.mjs` — reference branch-aware ChatGPT parser
- `tests/chat-atlas-at02-browser.test.mjs` — browser runtime invariants
- `scripts/verify-at02-index.mjs` — static integration and inline JavaScript syntax verifier

## Human Authority invariants

AI output cannot set or control:

- `status`
- `human_review`
- `approved_at`
- `approved_by`
- `memory_policy`
- `transfer_policy`

When Chat Atlas converts a candidate into a portable ContextItem input, it applies safe defaults:

- `memory_policy = review`
- `transfer_policy = manual_only`
- `provenance.derived = true`
- `provenance.derived_by = chat_atlas`

The exported envelope uses `intended_state = proposed` only as a routing statement. Approval itself is not performed by Chat Atlas.

## Responsibility changes from v1.2

Removed from the active browser mode selector:

- Memory Governance
- Next Chat Review / handoff behavior
- legacy combined Timeline + Governance mode

The active modes are now:

- ContextItem Producer
- Thinking Map
- Decision Map
- Full Conversation Map

Memory selection belongs to **Memory Curator**.

Transfer and handoff belong to **Context Bridge**.

Multi-model comparison belongs to **Roundtable AI**.

## ChatGPT branch integrity

AT-02 wires the browser parser to the AT-01 branch-aware extraction logic.

For ChatGPT `conversations.json`:

- `current_node` is followed back through the parent chain when available;
- if `current_node` is missing, the runtime selects a deepest leaf fallback;
- regenerated sibling branches are excluded from the active message stream;
- the selected branch mode and number of excluded alternative branches are included in the local conversation metadata.

This replaces the legacy behavior that flattened all mapping nodes and could mix mutually exclusive branches.

## Local-first behavior

`browser-runtime.js` is a classic browser script rather than an ES-module-only entry point. This keeps the runtime simple to host and avoids making AT-02 dependent on a bundler or external package registry.

The application still performs conversation-file parsing locally and does not upload the selected conversation or call an AI API.

## ContextItem export envelope

AT-02 exports a local JSON envelope containing:

- producer metadata
- optional Project ID
- conversation identity and branch metadata
- short navigational summary
- proposal-only `context_items[]`
- turning points
- conflicts
- unresolved questions
- boundary risks
- explicit Human Authority routing metadata

Exact duplicate candidates with the same `kind + normalized content` are skipped within one parsed result.

## Verification

CI verifies both the reference/runtime behavior and the integrated single-file browser shell. In addition to required/forbidden responsibility markers, every non-empty inline `<script>` body in `index.html` is parsed as JavaScript so duplicate declarations and other syntax regressions fail the gate before merge.

## Acceptance criteria

AT-02 is accepted when:

1. the public `index.html` uses the AT-02 browser runtime;
2. active ChatGPT parsing is branch-aware;
3. legacy Memory Governance / Handoff modes are not active in the UI;
4. Atlas Producer prompts are generated from the AT-01 contract;
5. returned AI JSON can be parsed into portable proposal-only ContextItems;
6. no AI-controlled approval or transfer fields survive conversion;
7. AT-01 and AT-02 tests pass;
8. static index integration verification passes;
9. integrated inline browser JavaScript passes syntax verification.
