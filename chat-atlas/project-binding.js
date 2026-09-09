// HIRAKU Tools — Chat Atlas AT-03
// Project Binding contract for the standalone browser runtime.
// Project identity is routing metadata only. It is not approval, memory authority,
// transfer authority, or evidence that the Project exists in Human Agency Core.

(function attachChatAtlasAT03(global) {
  "use strict";

  const PROJECT_BINDING_VERSION = "AT-03";
  const PROJECT_ID_PATTERN = /^prj_[A-Za-z0-9][A-Za-z0-9._:-]{1,199}$/;

  function normalizeProjectId(value, { allowNull = true } = {}) {
    const text = value == null ? "" : String(value).trim();
    if (!text) {
      if (allowNull) return null;
      throw new TypeError("Project ID is required");
    }
    if (!PROJECT_ID_PATTERN.test(text)) {
      throw new TypeError("Project ID must begin with prj_ and contain only safe identifier characters");
    }
    return text;
  }

  function projectIdFromFragment(fragment = "") {
    const raw = String(fragment || "").replace(/^#/, "");
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    if (!params.has("project")) return null;
    return normalizeProjectId(params.get("project"), { allowNull: false });
  }

  function resolveProjectBinding({ fragment = "", manualProjectId = null } = {}) {
    const fragmentProjectId = projectIdFromFragment(fragment);
    const manual = normalizeProjectId(manualProjectId, { allowNull: true });

    if (fragmentProjectId && manual && fragmentProjectId !== manual) {
      throw new Error("Project binding mismatch: workspace fragment and manual Project ID differ");
    }

    const projectId = fragmentProjectId || manual;
    if (!projectId) {
      return Object.freeze({
        binding_version: PROJECT_BINDING_VERSION,
        state: "unbound",
        project_id: null,
        source: "none",
        authority: "routing_reference_only",
        project_store_verification: "not_verified",
        network_disclosure: "none"
      });
    }

    return Object.freeze({
      binding_version: PROJECT_BINDING_VERSION,
      state: "bound",
      project_id: projectId,
      source: fragmentProjectId ? "workspace_fragment" : "manual_local_input",
      authority: "human_project_reference",
      project_store_verification: "not_verified",
      network_disclosure: fragmentProjectId
        ? "fragment_not_sent_in_http_request"
        : "none"
    });
  }

  function assertBindingMayRouteContext(binding) {
    if (!binding || typeof binding !== "object") {
      throw new TypeError("AT-03 Project Binding is required");
    }
    if (binding.binding_version !== PROJECT_BINDING_VERSION) {
      throw new Error("Unsupported Chat Atlas Project Binding version");
    }
    if (binding.state === "unbound") return true;
    if (binding.state !== "bound") throw new Error("Unknown Project Binding state");
    normalizeProjectId(binding.project_id, { allowNull: false });
    if (binding.authority !== "human_project_reference") {
      throw new Error("Bound Project reference lacks Human routing authority");
    }
    return true;
  }

  global.ChatAtlasAT03 = Object.freeze({
    PROJECT_BINDING_VERSION,
    PROJECT_ID_PATTERN,
    normalizeProjectId,
    projectIdFromFragment,
    resolveProjectBinding,
    assertBindingMayRouteContext
  });
})(typeof window !== "undefined" ? window : globalThis);
