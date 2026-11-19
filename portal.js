const keys = {
  favorites: "pm-tools-favorites",
  layouts: "pm-tools-layouts-v1",
  audience: "pm-tools-audience-v1",
  files: "pm-tools-personal-files-v1",
};
const search = document.getElementById("tool-search");
const picker = document.getElementById("team-picker");
const results = document.getElementById("results");
const grid = document.querySelector(".tool-grid");
const favoriteFilter = document.getElementById("favorites-filter");
const editButton = document.getElementById("edit-layout");
const editControls = document.getElementById("edit-controls");
const fileDialog = document.getElementById("file-link-dialog");
const fileInput = document.getElementById("file-url");
const fileError = document.getElementById("file-link-error");
const shareDialog = document.getElementById("share-dialog");
const shareInput = document.getElementById("share-url");
const shareStatus = document.getElementById("share-status");
const normalize = (text) => text.normalize("NFKC").toLowerCase();

function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // The current view and changes remain available when storage is disabled.
    return false;
  }
}

function readRecord(key) {
  const value = readLocal(key, {});
  return typeof value === "object" && !Array.isArray(value) ? value : {};
}

const tools = [...grid.querySelectorAll("[data-tool]")].map((card) => {
  const name = card.querySelector("h2").textContent.trim().replace(/\s*→$/, "");
  const keywords = normalize(card.dataset.keywords + " " + card.textContent);
  const favorite = card.querySelector("[data-favorite]");
  const controls = document.createElement("div");
  controls.className = "layout-controls";
  controls.hidden = true;
  const visibility = document.createElement("input");
  visibility.type = "checkbox";
  const label = document.createElement("label");
  label.append(visibility, "顯示");
  visibility.setAttribute("aria-label", "顯示" + name);
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "drag-handle";
  handle.textContent = "↕";
  handle.title = "拖拉順序";
  handle.setAttribute("aria-label", "排列" + name);
  controls.append(label, handle);
  card.querySelector(".tool-heading").append(controls);
  return {
    card, id: card.id, name, favorite, controls, visibility, handle,
    keywords,
  };
});
const byId = new Map(tools.map((tool) => [tool.id, tool]));
const allIds = tools.map((tool) => tool.id);
const presets = {
  home: tools.filter(({ card }) => card.hasAttribute("data-home")).map(({ id }) => id),
  sales: ["warehouse-movement", "demand-request", "stock-watch", "campaign-planning", "customer-analytics", "product-lookup", "brand-links"],
  operations: ["warehouse-movement", "demand-request", "warehouse-receiving", "stock-watch", "product-master", "momo-stock", "product-images", "momo-images", "campaign-planning", "operations-workbench", "content-ledger", "brand-links", "ingredient-lookup"],
  admin: ["automation-status", "customer-analytics", "warehouse-receiving", "stock-watch", "product-master", "seo-health", "operations-workbench", "compliance-tasks", "product-pif"],
  all: allIds,
};

function cleanIds(values) {
  return [...new Set(values.filter((id) => byId.has(id)))];
}

function validAudience(value) {
  return typeof value === "string" && Object.hasOwn(presets, value);
}

const params = new URLSearchParams(location.search);
const requestedAudience = params.get("team");
const rememberedAudience = readLocal(keys.audience, "home");
let audience = validAudience(requestedAudience)
  ? requestedAudience
  : validAudience(rememberedAudience) ? rememberedAudience : "home";
let shared = params.has("cards") ? cleanIds(params.get("cards").split(",")) : null;
const layouts = readRecord(keys.layouts);
const fileLinks = readRecord(keys.files);
const savedFavorites = readLocal(keys.favorites, []);
const favorites = new Set(Array.isArray(savedFavorites) ? cleanIds(savedFavorites) : []);
let favoritesOnly = false;
let editing = false;
let activeFile;
let drag;

function layoutKey() {
  return shared ? audience + ":" + shared.join(",") : audience;
}

function selectedIds() {
  const saved = layouts[layoutKey()];
  return Array.isArray(saved) ? cleanIds(saved) : shared ?? presets[audience];
}

function saveLayout(ids) {
  layouts[layoutKey()] = cleanIds(ids);
  saveLocal(keys.layouts, layouts);
}

function render(announcement) {
  const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
  const selected = selectedIds();
  const selectedSet = new Set(selected);
  const ordered = [...selected, ...allIds.filter((id) => !selectedSet.has(id))];
  const searchDefaultHome = words.length && audience === "home" &&
    !shared && !Object.hasOwn(layouts, layoutKey());
  const focused = document.activeElement;
  let count = 0;
  for (const id of ordered) {
    const tool = byId.get(id);
    const saved = favorites.has(id);
    const included = favoritesOnly ? saved && selectedSet.has(id) : searchDefaultHome || selectedSet.has(id);
    const visible = editing || (included && words.every((word) => tool.keywords.includes(word)));
    tool.card.hidden = !visible;
    tool.card.classList.toggle("is-unselected", editing && !selectedSet.has(id));
    tool.controls.hidden = !editing;
    tool.visibility.checked = selectedSet.has(id);
    tool.handle.disabled = !selectedSet.has(id);
    tool.favorite.hidden = editing;
    tool.favorite.setAttribute("aria-pressed", String(saved));
    tool.favorite.textContent = saved ? "★" : "☆";
    if (visible) count++;
    grid.append(tool.card);
  }
  if (focused instanceof HTMLElement && grid.contains(focused) && !focused.closest("[hidden]")) {
    focused.focus({ preventScroll: true });
  }

  picker.value = audience;
  search.disabled = editing;
  favoriteFilter.disabled = editing;
  favoriteFilter.setAttribute("aria-pressed", String(favoritesOnly));
  editButton.setAttribute("aria-pressed", String(editing));
  editButton.textContent = editing ? "完成編排" : "編排";
  editControls.hidden = !editing;

  results.className = count ? "sr-only" : "empty";
  results.textContent = announcement ?? (count ? "找到 " + count + " 項工具"
    : favoritesOnly && !words.length ? "點工具卡右上角的星號即可收藏。"
    : words.length ? "找不到符合的工具，請試試其他關鍵字。"
    : "這個入口目前沒有工具。點「編排」即可加入。");
  renderFileLinks();
}

function moveTool(id, target, after) {
  if (id === target) return;
  const order = selectedIds().filter((current) => current !== id);
  const index = order.indexOf(target);
  if (index < 0) return;
  const position = index + Number(after);
  order.splice(position, 0, id);
  saveLayout(order);
  render(byId.get(id).name + "已移到第 " + (position + 1) + " 項");
}

function updateDropTarget(x, y) {
  drag.target?.card.removeAttribute("data-drop");
  const card = document.elementFromPoint(x, y)?.closest("[data-tool]");
  const target = byId.get(card?.id);
  drag.target = target?.id !== drag.tool.id && target?.visibility.checked ? target : null;
  if (!drag.target) return;
  const box = drag.target.card.getBoundingClientRect();
  const sameRow = Math.abs(box.top - drag.tool.card.getBoundingClientRect().top) < 6;
  drag.after = sameRow ? x > box.left + box.width / 2 : y > box.top + box.height / 2;
  drag.target.card.dataset.drop = drag.after ? "after" : "before";
}

function scrollDrag() {
  if (!drag) return;
  const edge = 65;
  const amount = drag.y < edge ? -12 : drag.y > innerHeight - edge ? 12 : 0;
  drag.frame = 0;
  if (!amount) return;
  window.scrollBy(0, amount);
  updateDropTarget(drag.x, drag.y);
  drag.frame = requestAnimationFrame(scrollDrag);
}

function stopDrag(event, drop) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { tool, target, after, frame } = drag;
  drag = undefined;
  tool.card.classList.remove("is-dragging");
  target?.card.removeAttribute("data-drop");
  if (frame) cancelAnimationFrame(frame);
  if (drop && target) moveTool(tool.id, target.id, after);
}

for (const tool of tools) {
  tool.favorite.addEventListener("click", () => {
    if (favorites.has(tool.id)) favorites.delete(tool.id);
    else favorites.add(tool.id);
    saveLocal(keys.favorites, [...favorites]);
    render();
  });
  tool.visibility.addEventListener("change", () => {
    const ids = selectedIds().filter((id) => id !== tool.id);
    if (tool.visibility.checked) ids.push(tool.id);
    saveLayout(ids);
    render();
  });
  tool.handle.addEventListener("pointerdown", (event) => {
    if (!editing || drag || event.button !== 0) return;
    drag = { tool, pointerId: event.pointerId, x: event.clientX, y: event.clientY, frame: 0 };
    tool.handle.setPointerCapture(event.pointerId);
    tool.card.classList.add("is-dragging");
  });
  tool.handle.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    updateDropTarget(drag.x, drag.y);
    if (!drag.frame) drag.frame = requestAnimationFrame(scrollDrag);
  });
  tool.handle.addEventListener("pointerup", (event) => stopDrag(event, true));
  tool.handle.addEventListener("pointercancel", (event) => stopDrag(event, false));
  tool.handle.addEventListener("lostpointercapture", (event) => stopDrag(event, false));
  tool.handle.addEventListener("keydown", (event) => {
    const backward = ["ArrowUp", "ArrowLeft"].includes(event.key);
    const forward = ["ArrowDown", "ArrowRight"].includes(event.key);
    if (!backward && !forward) return;
    event.preventDefault();
    const order = selectedIds();
    const target = order[order.indexOf(tool.id) + (forward ? 1 : -1)];
    if (target) moveTool(tool.id, target, forward);
  });
}

const fileControls = [...document.querySelectorAll("[data-local-file]")].map((container) => ({
  anchor: container.querySelector("[data-file-anchor]"),
  button: container.querySelector("[data-file-setup]"),
  hint: container.querySelector("[data-file-help]"),
  key: container.dataset.localFile,
  kind: container.dataset.documentType,
  gid: container.dataset.gid,
}));

function driveFileUrl(value, kind) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/(document|spreadsheets)\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)(?:\/|$)/);
    if (url.origin !== "https://docs.google.com" || url.username || url.password || match?.[1] !== kind) return null;
    const exact = new URL("/" + kind + "/d/" + match[2] + "/edit", url.origin);
    const resourceKey = url.searchParams.get("resourcekey");
    if (resourceKey) exact.searchParams.set("resourcekey", resourceKey);
    return exact;
  } catch {
    return null;
  }
}

function renderFileLinks() {
  for (const file of fileControls) {
    const target = driveFileUrl(fileLinks[file.key], file.kind);
    file.hint.hidden = true;
    file.anchor.hidden = !target;
    file.button.hidden = Boolean(target) && !editing;
    if (target) {
      if (file.gid) target.hash = "gid=" + file.gid;
      file.anchor.href = target.href;
    } else {
      file.anchor.removeAttribute("href");
    }
  }
}

for (const file of fileControls) {
  file.button.addEventListener("click", () => {
    activeFile = file;
    fileDialog.querySelector("h2").textContent = "設定 " + file.anchor.textContent.replace(/\s*→$/, "").trim();
    fileInput.value = fileLinks[file.key] ?? "";
    fileError.hidden = true;
    fileDialog.showModal();
    fileInput.focus();
  });
}

document.getElementById("file-link-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const target = activeFile && driveFileUrl(fileInput.value, activeFile.kind);
  if (!target) {
    fileError.textContent = "請貼上 Google 文件或試算表的直達網址。";
    fileError.hidden = false;
    return;
  }
  fileLinks[activeFile.key] = target.href;
  saveLocal(keys.files, fileLinks);
  fileDialog.close();
  render("檔案直達連結已儲存");
  activeFile.anchor.focus();
});

const settingsFile = document.getElementById("link-settings-file");
const settingsText = document.getElementById("link-settings-text");
const importDialog = document.getElementById("import-dialog");
const importStatus = document.getElementById("import-status");
function parseFileSettings(text) {
  if (text.length > 32768) throw new Error("Settings too large");
  const settings = JSON.parse(text);
  if (settings?.version !== 1 || !settings.files || typeof settings.files !== "object") {
    throw new Error("Invalid settings");
  }
  const accepted = new Map();
  for (const { key, kind } of fileControls) {
    if (!Object.hasOwn(settings.files, key) || accepted.has(key)) continue;
    const target = driveFileUrl(settings.files[key], kind);
    if (!target) throw new Error("Invalid file URL");
    accepted.set(key, target.href);
  }
  if (!accepted.size) throw new Error("No recognized file links");
  return accepted;
}

function importLinks(text) {
  try {
    const accepted = parseFileSettings(text);
    for (const [key, value] of accepted) fileLinks[key] = value;
    saveLocal(keys.files, fileLinks);
    render();
    importStatus.textContent = "已匯入 " + accepted.size + " 個檔案連結。";
  } catch {
    importStatus.textContent = "無法匯入，請確認檔案是 Tools 的私用連結設定。";
  }
}

function applySetupLink() {
  const url = new URL(location.href);
  const text = new URLSearchParams(url.hash.slice(1)).get("private-links");
  if (text === null) return false;

  url.hash = "";
  history.replaceState(history.state, "", url);
  const status = document.getElementById("setup-status");
  status.hidden = false;
  try {
    const accepted = parseFileSettings(text);
    for (const [key, value] of accepted) {
      const { kind } = fileControls.find((file) => file.key === key);
      // Keep file links the user has already chosen in this browser.
      if (!driveFileUrl(fileLinks[key], kind)) fileLinks[key] = value;
    }
    const persisted = saveLocal(keys.files, fileLinks);
    status.textContent = persisted
      ? "已設定 " + accepted.size + " 個 Google 檔案直達連結。"
      : "目前可使用檔案直達連結。此瀏覽器無法儲存設定。";
  } catch {
    status.textContent = "這個私用設定連結無法讀取。";
  }
  render();
  return true;
}
document.getElementById("import-links").addEventListener("click", () => {
  settingsText.value = "";
  importStatus.textContent = "";
  importDialog.showModal();
});
document.getElementById("import-form").addEventListener("submit", (event) => {
  event.preventDefault();
  importLinks(settingsText.value);
  settingsText.value = "";
});
document.getElementById("pick-settings-file").addEventListener("click", () => settingsFile.click());
settingsFile.addEventListener("change", async () => {
  const file = settingsFile.files[0];
  settingsFile.value = "";
  if (file) importLinks(file.size <= 32768 ? await file.text() : "");
});

picker.addEventListener("change", () => {
  audience = picker.value;
  shared = null;
  favoritesOnly = false;
  editing = false;
  search.value = "";
  saveLocal(keys.audience, audience);
  const url = new URL(location.href);
  url.searchParams.set("team", audience);
  url.searchParams.delete("cards");
  history.replaceState(null, "", url);
  render();
});

editButton.addEventListener("click", () => {
  editing = !editing;
  search.value = "";
  favoritesOnly = false;
  render();
});

document.getElementById("reset-layout").addEventListener("click", () => {
  delete layouts[layoutKey()];
  saveLocal(keys.layouts, layouts);
  render("已還原入口預設");
});

favoriteFilter.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  search.value = "";
  render();
});

document.getElementById("share-layout").addEventListener("click", () => {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("team", audience);
  url.searchParams.set("cards", selectedIds().join(","));
  shareInput.value = url.href;
  shareStatus.textContent = "";
  shareDialog.showModal();
  shareInput.select();
});

document.getElementById("copy-share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareInput.value);
    shareStatus.textContent = "已複製";
  } catch {
    shareInput.select();
    shareStatus.textContent = "請複製選取的網址";
  }
});

for (const button of document.querySelectorAll("[data-dismiss]")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}

search.addEventListener("input", () => render());
window.addEventListener("hashchange", applySetupLink);
if (!applySetupLink()) render();
document.querySelector("[data-enhancement]").hidden = false;
