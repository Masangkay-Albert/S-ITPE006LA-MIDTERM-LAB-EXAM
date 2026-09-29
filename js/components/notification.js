export function renderNotification({ type, title, message, buttonText = "Return to catalog" }) {
  const icon = type === "success" ? "✓" : "!";
  const className = type === "success" ? "status-icon" : "status-icon error";

  return `
    <div class="modal-status">
      <div class="${className}" aria-hidden="true">${icon}</div>
      <div>
        <h2 id="modalTitle">${title}</h2>
        <p>${message}</p>
      </div>
      <div class="form-actions" style="justify-content: flex-start;">
        <button type="button" class="primary-button" id="notificationActionButton">${buttonText}</button>
      </div>
    </div>
  `;
}
