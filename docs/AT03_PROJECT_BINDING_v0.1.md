# AT-03 — Chat Atlas Project Binding v0.1

Status: **Implementation candidate**

## Purpose

AT-03 binds Chat Atlas Room 1 output to the same Human-owned Project used by the One House Workspace without merging Chat Atlas authority into Memory Curator, Context Bridge, Roundtable AI, or Human Gate.

> **Project binding is routing metadata, not approval.**

## Position in One House

```text
Human Project
  ├ Room 1 — Chat Atlas       / See
  ├ Room 2 — Memory Curator   / Remember
  ├ Room 3 — Context Bridge   / Transfer
  ├ Room 4 — Roundtable AI    / Compare
  └ Human Gate                / Decide
```

AT-03 closes the Room 1 Project-identity gap while preserving the existing module boundary.

## Binding sources

AT-03 supports two local binding sources:

1. `workspace_fragment`
   - URL fragment form: `#project=prj_...`
   - intended for One House Workspace navigation;
   - fragments are browser-side routing metadata and are not part of the HTTP request target sent to the server.
2. `manual_local_input`
   - the Human types a Project ID into the existing Project ID field;
   - useful for standalone/offline use.

AT-03 deliberately does **not** use `?project=` query parameters for Workspace handoff because query parameters can appear in server logs and intermediary metadata.

## Project Binding object

```json
{
  "binding_version": "AT-03",
  "state": "bound",
  "project_id": "prj_...",
  "source": "workspace_fragment",
  "authority": "human_project_reference",
  "project_store_verification": "not_verified",
  "network_disclosure": "fragment_not_sent_in_http_request"
}
```

Unbound standalone use remains valid:

```json
{
  "binding_version": "AT-03",
  "state": "unbound",
  "project_id": null,
  "source": "none",
  "authority": "routing_reference_only",
  "project_store_verification": "not_verified",
  "network_disclosure": "none"
}
```

## Verification boundary

Chat Atlas is separately hosted/versioned and does not read Human Agency Core `ProjectStore` directly.

Therefore:

```text
Project ID received
≠ Project existence cryptographically verified
≠ Project status verified
≠ ContextItem approved
```

The binding records `project_store_verification = not_verified` intentionally.

A later integration layer may add a trusted local bridge, but AT-03 must not pretend that a URL fragment proves Project existence.

## Human Authority

AT-03 never allows an external AI response to choose or alter the Project ID.

The Project ID is taken only from:

- Human Workspace navigation; or
- Human manual input.

AI-produced JSON fields such as `project_id`, `status`, `human_review`, `memory_policy`, or `transfer_policy` are not accepted as authority.

The exported envelope remains:

```text
producer = chat_atlas
intended_state = proposed
memory authority = Memory Curator
transfer authority = Context Bridge
final authority = Human Gate
```

## Privacy boundary

The Project ID is local routing metadata.

AT-03 does not add it to the external AI producer prompt. This prevents an opaque Human Project identifier from being sent to GPT, Claude, Gemini, or another provider merely because Room 1 is Project-bound.

The Project ID appears only in the local proposal envelope that the Human may later copy or import into the governed Human Agency workflow.

## Mismatch protection

If Chat Atlas receives a Workspace fragment Project ID and the local Project field contains a different Project ID, AT-03 rejects the binding rather than silently choosing one.

When launched from One House, the Project field is locked to the fragment binding for the current page. To work on another Project, reopen Chat Atlas from the intended Workspace Project.

## Invariants

```text
Project bound
≠ ContextItem approved
≠ memory persisted
≠ transfer approved
≠ provider handoff
≠ truth
≠ Human decision
```

AT-03 does not add provider API calls, automated transport, majority voting, Memory Policy changes, Transfer Policy changes, or Human Decision execution.

## Browser flow

```text
One House Workspace
        ↓ explicit Human navigation
#project=prj_...
        ↓ local fragment binding
Chat Atlas
        ↓ map conversation
AI produces proposal JSON
        ↓
Chat Atlas strips AI authority fields
        ↓
AT-03 attaches Human Project reference locally
        ↓
PROPOSED ContextItem envelope
        ↓
Memory Curator / Human Agency Core review
```

## Test boundary

Automated tests cover:

- safe Project ID validation;
- fragment binding;
- manual binding;
- mismatch rejection;
- unbound standalone mode;
- no query-parameter Project bootstrap;
- Project ID not inserted into external AI prompt;
- AI-provided Project ID cannot override Human binding;
- exported envelope contains AT-03 binding metadata;
- no provider network automation;
- browser JavaScript syntax / static integration markers.

Real Chrome/Edge end-to-end navigation from the deployed One House Workspace to the deployed Chat Atlas page remains a separate smoke-test/deployment check.
