export const appState = {
  events: [],
  filteredEvents: [],
  selectedEventId: null,
  filters: {
    search: "",
    category: "all",
    date: ""
  },
  registrationStatus: null
};

export function setEvents(events) {
  appState.events = events;
}

export function setFilteredEvents(events) {
  appState.filteredEvents = events;
}

export function setSelectedEventId(eventId) {
  appState.selectedEventId = eventId;
}

export function updateFilters(nextFilters) {
  appState.filters = { ...appState.filters, ...nextFilters };
}

export function resetFilters() {
  appState.filters = {
    search: "",
    category: "all",
    date: ""
  };
}

export function setRegistrationStatus(status) {
  appState.registrationStatus = status;
}

export function getSelectedEvent() {
  return appState.events.find((event) => event.id === appState.selectedEventId) ?? null;
}
