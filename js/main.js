import { appConfig } from "./config/config.js";
import { renderEventFilters } from "./components/eventFilters.js";
import { renderEventGrid } from "./components/eventGrid.js";
import { renderEventDetails } from "./components/eventDetails.js";
import { renderRegistrationForm } from "./components/registrationForm.js";
import { renderNotification } from "./components/notification.js";
import { getEvents, registerStudentForEvent } from "./services/eventService.js";
import { appState, resetFilters, setEvents, setFilteredEvents, setSelectedEventId, updateFilters } from "./state/appState.js";
import { trapFocus } from "./utils/accessibility.js";
import { formatSeatSummary } from "./utils/formatting.js";
import { validateRegistrationForm, validateField } from "./utils/validation.js";

const filtersContainer = document.querySelector("#filtersContainer");
const eventGrid = document.querySelector("#eventGrid");
const resultCount = document.querySelector("#resultCount");
const liveSummary = document.querySelector("#liveSummary");
const liveAvailability = document.querySelector("#liveAvailability");
const modal = document.querySelector("#eventModal");
const modalContent = document.querySelector("#modalContent");

function getFilteredEvents() {
  const { search, category, date } = appState.filters;

  return appState.events.filter((event) => {
    const matchesSearch =
      !search ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === "all" || event.category === category;
    const matchesDate = !date || event.date === date;

    return matchesSearch && matchesCategory && matchesDate;
  });
}

function renderLiveSummary() {
  const totalEvents = appState.filteredEvents.length;
  const seatsRemaining = appState.events.reduce((total, event) => total + formatSeatSummary(event).remaining, 0);

  liveSummary.textContent = `${totalEvents} upcoming event${totalEvents === 1 ? "" : "s"}`;
  liveAvailability.textContent =
    seatsRemaining > 0
      ? `${seatsRemaining} seats still available across campus.`
      : "No seats available across campus.";

  resultCount.textContent = `${totalEvents} event${totalEvents === 1 ? "" : "s"} matched`;
}

function renderCatalog() {
  const filtered = getFilteredEvents();
  setFilteredEvents(filtered);
  renderLiveSummary();
  renderEventGrid(eventGrid, filtered, {
    onViewDetails: handleViewDetails,
    onRegister: handleRegistrationStart
  });
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modalContent.innerHTML = "";
}

function openModal(content) {
  modalContent.innerHTML = content;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  const dialog = modal.querySelector(".modal-dialog");
  if (dialog) {
    trapFocus(dialog);
  }
}

function handleFilterChange(nextFilter = {}) {
  updateFilters(nextFilter);
  renderEventFilters(filtersContainer, appState.filters, handleFilterChange);
  renderCatalog();
}

function handleViewDetails(eventId) {
  const event = appState.events.find((item) => item.id === eventId);

  if (!event) {
    return;
  }

  setSelectedEventId(event.id);
  openModal(renderEventDetails(event));

  const backButton = modalContent.querySelector("#details-back-button");
  const registerButton = modalContent.querySelector("#details-register-button");

  backButton?.addEventListener("click", closeModal);
  registerButton?.addEventListener("click", () => {
    handleRegistrationStart(event.id);
  });
}

function handleRegistrationStart(eventId) {
  const event = appState.events.find((item) => item.id === eventId);

  if (!event) {
    return;
  }

  setSelectedEventId(event.id);
  openModal(renderRegistrationForm(event));

  const form = modalContent.querySelector("#registrationForm");
  const cancelButton = modalContent.querySelector("#cancelRegistration");

  cancelButton?.addEventListener("click", closeModal);

  // Attach real-time on-blur and on-input validation handlers
  const inputs = form?.querySelectorAll("input");
  inputs?.forEach((input) => {
    const fieldName = input.name;
    const errorNode = form.querySelector(`#${fieldName}Error`);

    const runFieldValidation = () => {
      const errorMsg = validateField(fieldName, input.value);
      input.setAttribute("aria-invalid", errorMsg ? "true" : "false");
      if (errorNode) {
        errorNode.textContent = errorMsg || "";
      }
    };

    input.addEventListener("blur", runFieldValidation);
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        runFieldValidation();
      }
    });
  });

  form?.addEventListener("submit", async (submitEvent) => {
    submitEvent.preventDefault();

    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    const validationResult = validateRegistrationForm(values);

    Object.keys(values).forEach((key) => {
      const input = form.querySelector(`[name="${key}"]`);
      const errorNode = form.querySelector(`#${key}Error`);

      if (input) {
        input.setAttribute("aria-invalid", validationResult.errors[key] ? "true" : "false");
      }

      if (errorNode) {
        errorNode.textContent = validationResult.errors[key] ?? "";
      }
    });

    if (!validationResult.isValid) {
      // Focus the first invalid input for accessibility
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    const submitBtn = form.querySelector("#submitRegistrationBtn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Reserving seat...";
    }

    const result = await registerStudentForEvent(event.id, values);

    if (!result.success) {
      openModal(
        renderNotification({
          type: "error",
          title: "Registration unavailable",
          message: result.message,
          buttonText: "Back to catalog"
        })
      );

      const actionButton = modalContent.querySelector("#notificationActionButton");
      actionButton?.addEventListener("click", closeModal);
      return;
    }

    renderCatalog();
    openModal(
      renderNotification({
        type: "success",
        title: "Registration confirmed",
        message: `${values.studentName.trim()} has been registered for ${event.title}.`,
        buttonText: "Back to catalog"
      })
    );

    const actionButton = modalContent.querySelector("#notificationActionButton");
    actionButton?.addEventListener("click", closeModal);
  });
}

async function initializeApp() {
  const events = await getEvents();
  setEvents(events);
  resetFilters();
  renderEventFilters(filtersContainer, appState.filters, handleFilterChange);
  renderCatalog();

  modal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

initializeApp();
