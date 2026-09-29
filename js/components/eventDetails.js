import { formatEventDate, formatSeatSummary } from "../utils/formatting.js";

export function renderEventDetails(event) {
  const summary = formatSeatSummary(event);

  return `
    <div class="form-panel">
      <h2 id="modalTitle">${event.title}</h2>
      <div class="detail-layout">
        <div>
          <img class="detail-image" src="${event.image}" alt="${event.imageAlt}" />
        </div>

        <div>
          <div class="detail-meta">
            <span class="badge category-badge">${event.category}</span>
            <span class="status-badge ${summary.isFull ? "full" : "open"}">${summary.isFull ? "Full" : "Open"}</span>
          </div>

          <p>${event.description}</p>

          <ul class="detail-grid" aria-label="Event overview">
            <li><span aria-hidden="true">📅</span> ${formatEventDate(event.date)}</li>
            <li><span aria-hidden="true">🕒</span> ${event.time}</li>
            <li><span aria-hidden="true">📍</span> ${event.venue}</li>
            <li><span aria-hidden="true">🎟️</span> ${summary.capacityLabel}</li>
          </ul>

          <div class="form-actions" style="justify-content: flex-start; margin-top: 1rem;">
            <button type="button" id="details-back-button" class="back-button">Back</button>
            <button type="button" id="details-register-button" class="primary-button" ${summary.isFull ? "disabled" : ""}>
              ${summary.isFull ? "Sold out" : "Register now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
