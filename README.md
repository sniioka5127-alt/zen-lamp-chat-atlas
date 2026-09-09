# zen-lamp-chat-atlas

A local browser tool for turning long AI conversations into a thinking map.

A document can be summarized.  
But a thinking process often needs to be mapped.

Chat Atlas reads a ChatGPT export `conversations.json` file locally in the browser and helps generate prompts for:

- Thinking Timeline
- Decision Log
- Memory Governance
- Next Chat Handoff
- Compact Index
- GPT / Gemini / Claude review prompts

## Privacy

The file is processed locally in your browser.  
It is not uploaded to a server.

## How to use

### Option A: ChatGPT export

1. Export your ChatGPT data.
2. Unzip the export file.
3. Find `conversations.json`.
4. Open Chat Atlas.
5. Load `conversations.json` in the browser.
6. Select a conversation and generate a prompt.

### Option B: Export-free input

You can also paste a copied conversation manually, or import plain `.txt` / `.md` logs from ChatGPT, Claude, Gemini, or another AI.

This makes `conversations.json` the cleanest path, but not the only path.

## Architecture direction — HIRAKU Tools

Chat Atlas is being refined as **Room 1** of a broader Human Agency workspace.

> One house, four rooms.

- **Chat Atlas** — see and understand what happened.
- **Memory Curator** — choose what remains.
- **Context Bridge** — choose what travels.
- **Roundtable AI** — compare multiple AI outputs without surrendering human judgment.

The integrated product may present these as one workspace, but responsibilities remain separated in the architecture.

### Migration note

The current public prototype still contains **Memory Governance**, **Next Chat Handoff**, and provider-specific review-prompt responsibilities inside Chat Atlas.

Under the new architecture:

- Chat Atlas will focus on conversation mapping, branches, questions, hypotheses, decisions, discoveries, and unresolved points;
- persistent memory selection moves to **Memory Curator**;
- next-chat and provider-specific transfer generation moves to **Context Bridge**;
- multi-model comparison belongs to **Roundtable AI**.

Existing runtime behavior is not being removed yet. The shared Human Agency Core and module boundaries are being specified first, then the prototype will be migrated incrementally.

## Status

Early prototype.  
Current public version: v1.2

New in v1.2:

- Manual paste input
- `.txt` / `.md` import
- Generic AI log support
- Source labels for ChatGPT / Claude / Gemini / Generic AI / Human Notes

## Project page

https://zen-lamp.com/tools/chat-atlas/

## Broader context

https://zen-lamp.com/for-reddit/

## Note

This is part of ZEN LAMP PROJECT, an independent project exploring human judgment, memory governance, and reflective AI design.
