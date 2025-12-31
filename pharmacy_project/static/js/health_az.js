(function () {
  const searchInput = document.getElementById("healthSearch");
  const grid = document.getElementById("healthGrid");
  const empty = document.getElementById("healthEmpty");
  const azRow = document.getElementById("azRow");

  if (!searchInput || !grid || !empty || !azRow) return;

  const items = Array.from(grid.querySelectorAll(".health-item"));
  let activeLetter = "all";

  function applyFilters() {
    const q = (searchInput.value || "").trim().toLowerCase();
    let visibleCount = 0;

    items.forEach((el) => {
      const title = (el.dataset.title || "").toLowerCase();
      const letter = (el.dataset.letter || "").toUpperCase();

      const matchQuery = !q || title.includes(q);
      const matchLetter = activeLetter === "all" || letter === activeLetter;

      const show = matchQuery && matchLetter;
      el.style.display = show ? "block" : "none";
      if (show) visibleCount++;
    });

    empty.style.display = visibleCount === 0 ? "block" : "none";
  }

  searchInput.addEventListener("input", applyFilters);

  azRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".az-btn");
    if (!btn) return;

    azRow.querySelectorAll(".az-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    activeLetter = (btn.dataset.letter || "all").toUpperCase();
    applyFilters();
  });

  applyFilters();
})();
