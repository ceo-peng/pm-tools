const storageKey = "pm-tools-favorites";
const search = document.getElementById("tool-search");
const results = document.getElementById("results");
const viewButtons = [...document.querySelectorAll("[data-view]")];
const normalize = (text) => text.normalize("NFKC").toLowerCase();
const tools = [...document.querySelectorAll("[data-tool]")].map((card) => ({
  card,
  favorite: card.querySelector("[data-favorite]"),
  keywords: normalize(card.dataset.keywords + " " + card.textContent),
}));

let view = "home";
let storedFavorites;
try {
  storedFavorites = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
} catch {
  storedFavorites = [];
}
const favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);

function render() {
  const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const { card, favorite, keywords } of tools) {
    const saved = favorites.has(card.id);
    const included = view !== "favorites" || saved;
    const visible = included && (words.length
      ? words.every((word) => keywords.includes(word))
      : view !== "home" || card.hasAttribute("data-home"));
    card.hidden = !visible;
    if (visible) count++;
    favorite.setAttribute("aria-pressed", String(saved));
    favorite.textContent = saved ? "★" : "☆";
  }

  for (const button of viewButtons) {
    button.setAttribute("aria-pressed", String(view === button.dataset.view));
  }

  results.className = count ? "sr-only" : "empty";
  results.textContent = count ? "找到 " + count + " 項工具"
    : view === "favorites" && !words.length
      ? "點工具卡右上角的星號即可收藏。"
      : "找不到符合的工具，請試試其他關鍵字。";
}

for (const { card, favorite } of tools) {
  favorite.hidden = false;
  favorite.addEventListener("click", () => {
    if (favorites.has(card.id)) favorites.delete(card.id);
    else favorites.add(card.id);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...favorites]));
    } catch {
      // Search and favorites work without browser storage for the current visit.
    }
    render();
  });
}
for (const button of viewButtons) {
  button.addEventListener("click", () => {
    view = button.dataset.view;
    search.value = "";
    render();
  });
}
search.addEventListener("input", render);
render();
document.querySelector("[data-enhancement]").hidden = false;
