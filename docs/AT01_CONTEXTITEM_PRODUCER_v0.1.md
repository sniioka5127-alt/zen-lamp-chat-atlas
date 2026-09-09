# AT-01 — Chat Atlas as ContextItem Producer v0.1

Status: implementation candidate

## Purpose

Chat Atlas is Room 1 of HIRAKU Tools.

Its responsibility is to **see and map what happened in a conversation** and produce structured ContextItem candidates for later human review.

It is not responsible for deciding what becomes persistent memory and it is not responsible for transfer/handoff.

## Boundary

Chat Atlas may:

- map thinking trajectories and turning points
- identify decisions, constraints, discoveries, questions, hypotheses, evidence and boundary risks
- preserve provenance and source anchors
- emit portable ContextItem candidates

Chat Atlas must not:

- approve or reject a ContextItem
- choose Keep / Temporary / Drop as a final human memory decision
- set Transfer Policy
- generate Next Chat Handoff
- treat AI agreement as a human decision

## AT-01 output contract

The external AI is asked to return machine-readable JSON containing:

- `context_items[]`
- `turning_points[]`
- `conflicts[]`
- `unresolved_questions[]`
- `boundary_risks[]`

Each candidate contains semantic content, a Core-compatible `kind`, an Atlas-specific marker, source metadata, provenance, rationale and an optional confidence note.

The AI is explicitly forbidden from setting:

- `status`
- `human_review`
- `approved_at`
- `approved_by`
- `memory_policy`
- `transfer_policy`

When converted into a portable ContextItem input, AT-01 applies safe defaults:

- `memory_policy = review`
- `transfer_policy = manual_only`
- provenance `derived = true`
- provenance `derived_by = chat_atlas`

No approval fields are added. Human Agency Core remains responsible for creating the item as `proposed` and for later Human Gate transitions.

## ChatGPT branch integrity

The previous Chat Atlas v1.2 parser flattened all nodes in `conversation.mapping` and then sorted messages by timestamp. In conversations with regenerated or edited branches, that can mix mutually exclusive sibling branches into a single apparent conversation.

AT-01 adds a branch-aware parser:

1. If `current_node` is present, follow its parent chain back to the root.
2. If `current_node` is unavailable, choose a deepest leaf path as a conservative fallback.
3. Do not combine sibling branches into one message stream.
4. Report branch metadata including the number of alternative leaves.

This parser is a reference implementation for later browser-runtime integration.

## Files

- `chat-atlas/producer.mjs` — producer prompt contract, parser and portable ContextItem conversion
- `chat-atlas/chatgpt-branch.mjs` — branch-aware ChatGPT export parser
- `tests/chat-atlas-at01.test.mjs` — boundary and branch integrity tests
- `.github/workflows/chat-atlas-at01.yml` — CI

## Migration note

The existing `index.html` v1.2 browser runtime remains available while AT-01 is reviewed. It still contains legacy Memory Governance / Next Chat prompt modes.

AT-01 freezes the new producer boundary first. The subsequent browser integration step should replace those legacy responsibilities with the AT-01 producer contract without breaking local import paths.
