# zen-lamp-chat-atlas

A local-first tool for turning long AI conversations into a thinking map and structured ContextItem candidates.

A document can be summarized.  
But a thinking process often needs to be mapped.

## Architecture direction — HIRAKU Tools

Chat Atlas is **Room 1** of a broader Human Agency workspace.

> One house, four rooms.

- **Chat Atlas** — see and understand what happened.
- **Memory Curator** — choose what remains.
- **Context Bridge** — choose what travels.
- **Roundtable AI** — compare multiple AI outputs without surrendering human judgment.

The product may be integrated as one workspace, while module responsibilities remain separated in the architecture.

## AT-01 — ContextItem Producer

AT-01 defines Chat Atlas as a **ContextItem producer**.

Chat Atlas may map:

- thinking trajectories
- turning points
- decisions
- constraints
- discoveries
- questions
- hypotheses
- evidence
- unresolved points
- boundary risks

It may propose structured ContextItem candidates, but it does **not** decide what becomes persistent memory and does **not** generate transfer/handoff.

The AT-01 contract explicitly prevents an external AI from controlling:

- approval status
- Human Review state
- Memory Policy
- Transfer Policy

Portable candidates use safe defaults for later Human Agency Core intake:

- `memory_policy = review`
- `transfer_policy = manual_only`
- `derived_by = chat_atlas`
- no approval fields

See [`docs/AT01_CONTEXTITEM_PRODUCER_v0.1.md`](docs/AT01_CONTEXTITEM_PRODUCER_v0.1.md).

## AT-02 — Browser Runtime Integration

AT-02 connects the v1.3 browser UI to the AT-01 producer contract.

The browser flow is now:

1. load or paste a conversation locally;
2. review the selected conversation;
3. generate an **Atlas Producer** prompt;
4. paste the prompt into an AI chosen by the user;
5. paste the returned Atlas JSON back into Chat Atlas;
6. parse it into proposal-only portable `ContextItem[]`;
7. copy or download the ContextItem JSON for later Memory Curator / Human Agency Core intake.

The active browser modes are:

- ContextItem Producer
- Thinking Map
- Decision Map
- Full Conversation Map

Legacy **Memory Governance** and next-chat handoff responsibilities are no longer active Chat Atlas modes.

AT-02 also wires the browser UI to branch-aware ChatGPT parsing, so regenerated sibling branches are not silently mixed into the selected conversation.

See [`docs/AT02_BROWSER_RUNTIME_v0.1.md`](docs/AT02_BROWSER_RUNTIME_v0.1.md).

## ChatGPT branch integrity

The branch-aware parser:

1. follows `current_node` back through its parent chain when available;
2. falls back to a deepest leaf path when `current_node` is unavailable;
3. keeps alternative sibling branches out of the active message stream;
4. reports alternative branch metadata for later Atlas visualization.

This replaces the older v1.2 behavior that flattened every node in `conversation.mapping` and could mix mutually exclusive regenerated branches.

## Privacy

Conversation files are processed locally in the browser.  
The current browser prototype does not upload the selected conversation to a server or call an AI API.

The user chooses whether to copy the generated producer prompt into an external AI.

## Input paths

### Option A: ChatGPT export

1. Export your ChatGPT data.
2. Unzip the export file.
3. Find `conversations.json`.
4. Open Chat Atlas.
5. Load `conversations.json` in the browser.
6. Select a conversation and generate an Atlas Producer prompt.

### Option B: Export-free input

You can also paste a copied conversation manually, or import plain `.txt` / `.md` logs from ChatGPT, Claude, Gemini, or another AI.

## AT-02 reference files

- `index.html`
- `chat-atlas/browser-runtime.js`
- `chat-atlas/producer.mjs`
- `chat-atlas/chatgpt-branch.mjs`
- `tests/chat-atlas-at01.test.mjs`
- `tests/chat-atlas-at02-browser.test.mjs`
- `scripts/verify-at02-index.mjs`
- `.github/workflows/chat-atlas-at02.yml`

## Status

Browser runtime: **v1.3 / AT-02 integrated**  
AT-01 producer contract: **implemented**  
AT-02 browser integration: **implemented**

## Project page

https://zen-lamp.com/tools/chat-atlas/

## Broader context

https://zen-lamp.com/for-reddit/

## Note

This is part of ZEN LAMP PROJECT, an independent project exploring human judgment, memory governance, provenance, and reflective AI design.
