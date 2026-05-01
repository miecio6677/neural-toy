(() => {
  const cards = [...document.querySelectorAll("[data-game-card]")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const searchInput = document.querySelector("#search-games");
  const countLabel = document.querySelector("#game-count");
  const emptyState = document.querySelector("#empty-state");
  const randomButton = document.querySelector("[data-random-game]");

  let activeFilter = "all";

  function cardMatches(card, query) {
    const genres = card.dataset.genres ?? "";
    const title = card.dataset.title ?? "";
    const searchable = `${title} ${genres}`.toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter = activeFilter === "all" || genres.split(/\s+/).includes(activeFilter);
    return matchesSearch && matchesFilter;
  }

  function updateCatalog() {
    const query = (searchInput?.value ?? "").trim().toLowerCase();
    let visible = 0;

    for (const card of cards) {
      const matches = cardMatches(card, query);
      card.hidden = !matches;
      if (matches) visible += 1;
    }

    if (countLabel) {
      countLabel.textContent = `${visible} of ${cards.length} games`;
    }
    emptyState?.classList.toggle("visible", visible === 0);
  }

  function setFilter(nextFilter) {
    activeFilter = nextFilter;
    for (const button of filters) {
      button.classList.toggle("active", button.dataset.filter === activeFilter);
    }
    updateCatalog();
  }

  function openRandomGame() {
    const visibleCards = cards.filter((card) => !card.hidden);
    const pool = visibleCards.length ? visibleCards : cards;
    const card = pool[Math.floor(Math.random() * pool.length)];
    if (card?.href) {
      window.location.href = card.href;
    }
  }

  for (const button of filters) {
    button.addEventListener("click", () => setFilter(button.dataset.filter ?? "all"));
  }

  searchInput?.addEventListener("input", updateCatalog);
  randomButton?.addEventListener("click", openRandomGame);

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }

  updateCatalog();
})();
