export function formatEventDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function getRegistrationCount(event) {
  return event.registrations ? event.registrations.length : 0;
}

export function getRemainingSeats(event) {
  return Math.max(event.capacity - getRegistrationCount(event), 0);
}

export function getCapacityPercent(event) {
  const count = getRegistrationCount(event);
  return Math.min((count / event.capacity) * 100, 100);
}

export function formatSeatSummary(event) {
  const registeredCount = getRegistrationCount(event);
  const remaining = getRemainingSeats(event);
  return {
    registeredCount,
    remaining,
    isFull: remaining === 0,
    capacityLabel: `${registeredCount} / ${event.capacity} seats`,
    remainingLabel: remaining === 0 ? "No seats left" : `${remaining} seats left`
  };
}
