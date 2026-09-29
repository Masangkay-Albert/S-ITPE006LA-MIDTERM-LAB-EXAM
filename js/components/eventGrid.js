import { renderEventCard } from "./eventCard.js";

export function renderEventGrid(container, events, { onViewDetails, onRegister }) {
  if (!events.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No events match your filters</h3>
        <p>Try clearing a filter or searching for a different topic.</p>
      </div>
    `;
    return;
  }

  const cards = events.map((event) => renderEventCard(event, onViewDetails, onRegister)).join("");
  container.innerHTML = cards;

  container.querySelectorAll("[data-view-details]").forEach((button) => {
    button.addEventListener("click", () => onViewDetails(button.dataset.viewDetails));
  });

  container.querySelectorAll("[data-register-event]").forEach((button) => {
    const eventId = button.dataset.registerEvent;
    if (!button.disabled) {
      button.addEventListener("click", () => onRegister(eventId));
    }
  });
}
