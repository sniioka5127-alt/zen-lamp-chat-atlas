// HIRAKU Tools — Chat Atlas AT-01
// Branch-aware extraction for ChatGPT conversations.json.

function normalizeRole(role) {
  if (!role) return "unknown";
  if (role === "assistant") return "Assistant";
  if (role === "user") return "User";
  if (role === "system") return "System";
  if (role === "tool") return "Tool";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function extractMessageText(message) {
  if (!message || !message.content) return "";
  const content = message.content;

  if (Array.isArray(content.parts)) {
    return content.parts.map(part => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return JSON.stringify(part);
      }
      return String(part ?? "");
    }).join("\n").trim();
  }

  if (typeof content.text === "string") return content.text.trim();
  if (Array.isArray(content.text)) return content.text.join("\n").trim();
  if (typeof content === "string") return content.trim();
  return "";
}

function nodeMessageTime(node) {
  const t = node?.message?.create_time;
  return typeof t === "number" && Number.isFinite(t) ? t : 0;
}

function buildPathToRoot(mapping, leafId) {
  const path = [];
  const seen = new Set();
  let id = leafId;

  while (id && mapping[id] && !seen.has(id)) {
    seen.add(id);
    path.push(id);
    id = mapping[id]?.parent || null;
  }

  path.reverse();
  return path;
}

function getLeafIds(mapping) {
  const ids = Object.keys(mapping || {});
  const parentIds = new Set();
  for (const node of Object.values(mapping || {})) {
    if (node?.parent) parentIds.add(node.parent);
  }
  return ids.filter(id => !parentIds.has(id));
}

function chooseFallbackLeaf(mapping) {
  const leaves = getLeafIds(mapping);
  if (!leaves.length) return null;

  const ranked = leaves.map(id => {
    const path = buildPathToRoot(mapping, id);
    let latest = 0;
    for (const nodeId of path) latest = Math.max(latest, nodeMessageTime(mapping[nodeId]));
    return { id, depth: path.length, latest };
  });

  ranked.sort((a, b) => (b.depth - a.depth) || (b.latest - a.latest) || a.id.localeCompare(b.id));
  return ranked[0]?.id || null;
}

export function extractActiveBranch(conv = {}) {
  const mapping = conv.mapping || {};
  const leaves = getLeafIds(mapping);
  const currentNode = conv.current_node && mapping[conv.current_node]
    ? conv.current_node
    : null;
  const leafId = currentNode || chooseFallbackLeaf(mapping);
  const pathIds = leafId ? buildPathToRoot(mapping, leafId) : [];

  const messages = pathIds
    .map(nodeId => {
      const msg = mapping[nodeId]?.message;
      if (!msg || !msg.author || msg.author.role === "system") return null;
      const text = extractMessageText(msg);
      if (!text) return null;
      return {
        node_id: nodeId,
        id: msg.id || "",
        role: normalizeRole(msg.author.role),
        rawRole: msg.author.role,
        create_time: msg.create_time || 0,
        text
      };
    })
    .filter(Boolean);

  return {
    messages,
    path_ids: pathIds,
    selected_leaf_id: leafId,
    branch_mode: currentNode ? "current_node" : "deepest_leaf_fallback",
    leaf_count: leaves.length,
    alternative_branch_count: Math.max(0, leaves.length - (leafId ? 1 : 0))
  };
}

export function parseChatGPTConversationsBranchAware(rawJson) {
  const arr = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
  if (!Array.isArray(arr)) throw new Error("conversations.json is not an array.");

  return arr.map((conv, index) => {
    const branch = extractActiveBranch(conv);
    return {
      index,
      id: conv.id || String(index),
      title: conv.title || `Untitled ${index + 1}`,
      create_time: conv.create_time || 0,
      update_time: conv.update_time || conv.create_time || 0,
      messages: branch.messages,
      messageCount: branch.messages.length,
      branch
    };
  }).filter(c => c.messages.length > 0);
}
