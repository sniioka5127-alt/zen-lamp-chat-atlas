# zen-lamp-chat-atlas

A local browser tool for turning long ChatGPT conversations into a thinking map.

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
