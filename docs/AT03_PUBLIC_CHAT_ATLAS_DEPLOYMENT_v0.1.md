# AT-03｜Public Chat Atlas Deployment v0.1

Status: **Deployment candidate**

## Purpose

Publish the verified AT-03 Human Project Binding build of Chat Atlas to:

`https://zen-lamp.com/tools/chat-atlas/`

without weakening the Local First / Human Agency boundaries established by AT-01 through AT-03.

## Source of truth

Repository: `sniioka5127-alt/zen-lamp-chat-atlas`

The public deployment bundle is generated from the exact Git commit that runs the workflow. The bundle contains only:

- `index.html`
- `chat-atlas/browser-runtime.js`
- `chat-atlas/project-binding.js`
- `DEPLOYMENT_MANIFEST.json` (deployment evidence only; it does not need to be served publicly)

The three runtime files are the only files required to update the existing `/tools/chat-atlas/` deployment. Existing root favicon/site-manifest assets and unrelated ZEN LAMP pages must be preserved.

## Hostinger/manual deployment boundary

The deployment bundle is intentionally separate from source merge. Until authenticated Hostinger deployment/rollback is formally automated, publishing is a Human-controlled infrastructure action.

For the existing ZEN LAMP hosting layout, upload the **contents** of the generated bundle into the existing directory that serves `/tools/chat-atlas/`:

```text
/tools/chat-atlas/
  index.html                         ← replace
  chat-atlas/
    browser-runtime.js              ← replace
    project-binding.js              ← add or replace
```

Do not replace the entire ZEN LAMP site root and do not delete unrelated files in `/tools/chat-atlas/`.

## Post-deployment verification

The deployment is not complete until the public endpoint verifies all of the following:

1. `/tools/chat-atlas/` returns HTTP 2xx.
2. Public `index.html` references `./chat-atlas/project-binding.js`.
3. `project-binding.js` returns HTTP 2xx.
4. Public source contains AT-03 markers including `PROJECT_BINDING_VERSION`, `human_project_reference`, and `project_store_verification`.
5. A URL in the form `#project=prj_...` binds locally while the Project ID remains absent from the HTTP query string.
6. No provider/network transport is introduced by `project-binding.js`.

The existing E2E-01 deployment verifier in the One House repository can be rerun after publishing to turn the public deployment observation from stale/fail to pass.

## Human Agency invariants

Deployment does not change these meanings:

- Project bound ≠ ContextItem approved.
- Project bound ≠ Memory persisted.
- Project bound ≠ Transfer approved.
- Project ID is not inserted into external AI prompts.
- Chat Atlas remains proposal-only.
- No provider API transport is added.
