import { formatEventDate, formatSeatSummary } from "../utils/formatting.js";

export function renderEventCard(event, onViewDetails, onRegister) {
  const summary = formatSeatSummary(event);
  const isAvailable = !summary.isFull;

  return `
    <article class="event-card" aria-label="${event.title}">
      <img src="${event.image}" alt="${event.imageAlt}" />
      <div class="event-content">
        <div class="card-topline">
          <span class="badge category-badge">${event.category}</span>
          <span class="status-badge ${isAvailable ? "open" : "full"}">${isAvailable ? "Open" : "Full"}</span>
        </div>

        <div>
          <h3>${event.title}</h3>
        </div>

        <p>${event.description}</p>

        <ul class="event-meta" aria-label="Event details">
          <li><span aria-hidden="true">📅</span> ${formatEventDate(event.date)}</li>
          <li><span aria-hidden="true">🕒</span> ${event.time}</li>
          <li><span aria-hidden="true">📍</span> ${event.venue}</li>
        </ul>

        <div class="capacity-block">
          <div class="capacity-row">
            <strong>${summary.capacityLabel}</strong>
            <span>${summary.remainingLabel}</span>
          </div>
          <div class="progress-bar" aria-hidden="true">
            <span style="width: ${Math.min((summary.registeredCount / event.capacity) * 100, 100)}%"></span>
          </div>
        </div>

        <div class="card-actions">
          <button type="button" class="secondary-button" data-view-details="${event.id}">View details</button>
          <button type="button" class="primary-button" data-register-event="${event.id}" ${isAvailable ? "" : "disabled"}>
            ${isAvailable ? "Register" : "Sold out"}
          </button>
        </div>
      </div>
    </article>
  `;
}
