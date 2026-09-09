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

## ChatGPT branch integrity

AT-01 also adds a branch-aware parser for ChatGPT `conversations.json`.

The older v1.2 parser flattened every node in `conversation.mapping` and sorted messages by time. In conversations with regenerated or edited branches, that can mix sibling branches that were never part of the same active conversation.

The AT-01 reference parser instead:

1. follows `current_node` back through its parent chain when available;
2. falls back to a deepest leaf path when `current_node` is unavailable;
3. keeps alternative sibling branches out of the active message stream;
4. reports alternative branch metadata for later Atlas visualization.

## Privacy

Conversation files are intended to be processed locally in the browser.  
The current public prototype does not upload the selected conversation to a server or call an AI API.

## Current public input paths

### Option A: ChatGPT export

1. Export your ChatGPT data.
2. Unzip the export file.
3. Find `conversations.json`.
4. Open Chat Atlas.
5. Load `conversations.json` in the browser.
6. Select a conversation and generate a prompt.

### Option B: Export-free input

You can also paste a copied conversation manually, or import plain `.txt` / `.md` logs from ChatGPT, Claude, Gemini, or another AI.

## Migration note

The current public `index.html` v1.2 browser runtime still contains legacy **Memory Governance**, **Next Chat Handoff**, and provider-specific prompt responsibilities.

AT-01 freezes and tests the new producer boundary before that large single-file runtime is migrated. Under the adopted architecture:

- persistent memory selection belongs to **Memory Curator**;
- transfer/handoff belongs to **Context Bridge**;
- multi-model comparison belongs to **Roundtable AI**.

The v1.2 runtime remains available as a fallback until the browser integration step is completed.

## AT-01 reference files

- `chat-atlas/producer.mjs`
- `chat-atlas/chatgpt-branch.mjs`
- `tests/chat-atlas-at01.test.mjs`
- `.github/workflows/chat-atlas-at01.yml`

## Status

Public browser prototype: **v1.2**  
AT-01 reference producer: **implementation candidate**

## Project page

https://zen-lamp.com/tools/chat-atlas/

## Broader context

https://zen-lamp.com/for-reddit/

## Note

This is part of ZEN LAMP PROJECT, an independent project exploring human judgment, memory governance, provenance, and reflective AI design.
