import fs from "node:fs";

const path = "index.html";
let html = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  const count = html.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  html = html.replace(before, after);
}

replaceOnce(
  '<script src="./chat-atlas/browser-runtime.js"></script>',
  '<script src="./chat-atlas/browser-runtime.js"></script>\n<script src="./chat-atlas/project-binding.js"></script>',
  "AT-03 runtime script"
);

replaceOnce(
  '<input id="projectIdInput" placeholder="e.g. prj_hiraku_tools"/>\n<div class="hint">If left blank, the exported candidates remain portable and can be assigned to a project later.</div>',
  '<input id="projectIdInput" placeholder="e.g. prj_hiraku_tools"/>\n<div class="hint">If left blank, the exported candidates remain portable and can be assigned to a project later.</div>\n<div class="status" id="projectBindingStatus">AT-03: No Human Project bound. Standalone portable mode.</div>',
  "AT-03 Project status UI"
);

replaceOnce(
`    function setStatus(el, msg, type = "") {
      el.textContent = msg;
      el.className = "status" + (type ? " " + type : "");
    }
`,
`    function setStatus(el, msg, type = "") {
      el.textContent = msg;
      el.className = "status" + (type ? " " + type : "");
    }

    function currentProjectBinding() {
      if (!window.ChatAtlasAT03) throw new Error("Chat Atlas AT-03 Project Binding runtime is unavailable.");
      const binding = window.ChatAtlasAT03.resolveProjectBinding({
        fragment: location.hash,
        manualProjectId: $("projectIdInput")?.value || null
      });
      window.ChatAtlasAT03.assertBindingMayRouteContext(binding);
      return binding;
    }

    function renderProjectBindingStatus(binding, error = null) {
      const status = $("projectBindingStatus");
      if (!status) return;
      if (error) {
        setStatus(status, error.message || String(error), "bad");
        return;
      }
      if (binding?.state === "bound") {
        const source = binding.source === "workspace_fragment" ? "One House fragment" : "manual local input";
        setStatus(
          status,
          "AT-03: Bound to " + binding.project_id + " via " + source + ". Routing reference only; ProjectStore not verified. Project ID is not added to the external AI prompt.",
          "ok"
        );
      } else {
        setStatus(status, "AT-03: No Human Project bound. Standalone portable mode. Project ID is not sent to an AI provider.");
      }
    }

    function bootstrapProjectBinding() {
      const input = $("projectIdInput");
      if (!input) return;
      try {
        if (!window.ChatAtlasAT03) throw new Error("Chat Atlas AT-03 Project Binding runtime is unavailable.");
        const fragmentProjectId = window.ChatAtlasAT03.projectIdFromFragment(location.hash);
        if (fragmentProjectId) {
          input.value = fragmentProjectId;
          input.readOnly = true;
          input.title = "Bound by One House Workspace fragment. Reopen Chat Atlas from another Project to change it.";
        }
        renderProjectBindingStatus(currentProjectBinding());
      } catch (error) {
        input.readOnly = Boolean(window.ChatAtlasAT03?.projectIdFromFragment(location.hash));
        renderProjectBindingStatus(null, error);
      }
    }
`,
  "AT-03 binding helpers"
);

replaceOnce(
`    function buildContextItemEnvelope(parsed) {
      const projectId = $("projectIdInput") ? $("projectIdInput").value.trim() : "";
      const conversationId = selectedConversation?.id || null;
`,
`    function buildContextItemEnvelope(parsed) {
      const binding = currentProjectBinding();
      const projectId = binding.project_id;
      const conversationId = selectedConversation?.id || null;
`,
  "AT-03 envelope binding source"
);

replaceOnce(
`        intended_state: "proposed",
        project_id: projectId || null,
        conversation: {
`,
`        intended_state: "proposed",
        project_id: projectId || null,
        project_binding: binding,
        conversation: {
`,
  "AT-03 envelope binding metadata"
);

replaceOnce(
`    $("searchInput").addEventListener("input", renderList);
    $("sortSelect").addEventListener("change", renderList);
`,
`    $("searchInput").addEventListener("input", renderList);
    $("projectIdInput").addEventListener("input", () => {
      try {
        renderProjectBindingStatus(currentProjectBinding());
      } catch (error) {
        renderProjectBindingStatus(null, error);
      }
    });
    $("sortSelect").addEventListener("change", renderList);
`,
  "AT-03 Project input listener"
);

replaceOnce(
`    updateStats();
  </script>
`,
`    bootstrapProjectBinding();
    updateStats();
  </script>
`,
  "AT-03 bootstrap"
);

fs.writeFileSync(path, html);
