import { appConfig } from "../config/config.js";

export function renderEventFilters(container, filters, onFilterChange) {
  const categoryOptions = [
    '<option value="all">All categories</option>',
    ...appConfig.categoryOptions.map(
      (category) => `<option value="${category}" ${filters.category === category ? "selected" : ""}>${category}</option>`
    )
  ].join("");

  container.innerHTML = `
    <div class="filters-header">
      <h2 id="filters-heading">Find an event</h2>
      <button type="button" class="clean-button" id="clearFiltersBtn">Clear filters</button>
    </div>

    <div class="filter-grid" aria-label="Event filters">
      <div class="field">
        <label for="searchInput">Search</label>
        <input
          id="searchInput"
          name="search"
          type="search"
          aria-label="Search event titles or keywords"
          value="${filters.search}"
          placeholder="Search by title or keyword"
        />
      </div>

      <div class="field">
        <label for="categoryFilter">Category</label>
        <select id="categoryFilter" name="category" aria-label="Filter by event category">
          ${categoryOptions}
        </select>
      </div>

      <div class="field">
        <label for="dateFilter">Date</label>
        <input
          id="dateFilter"
          name="date"
          type="date"
          aria-label="Filter by event date"
          value="${filters.date}"
        />
      </div>
    </div>
  `;

  const searchInput = container.querySelector("#searchInput");
  const categoryFilter = container.querySelector("#categoryFilter");
  const dateFilter = container.querySelector("#dateFilter");
  const clearButton = container.querySelector("#clearFiltersBtn");

  searchInput.addEventListener("input", (event) => {
    onFilterChange({ search: event.target.value });
  });

  categoryFilter.addEventListener("change", (event) => {
    onFilterChange({ category: event.target.value });
  });

  dateFilter.addEventListener("change", (event) => {
    onFilterChange({ date: event.target.value });
  });

  clearButton.addEventListener("click", () => {
    onFilterChange({ search: "", category: "all", date: "" });
  });
}
