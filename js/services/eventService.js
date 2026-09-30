import { events } from "../data/events.js";

export async function getEvents() {
  return [...events];
}

export async function registerStudentForEvent(eventId, formValues) {
  const targetEvent = events.find((event) => event.id === eventId);

  if (!targetEvent) {
    return {
      success: false,
      message: "Selected event could not be found."
    };
  }

  const currentRegistrations = targetEvent.registrations ?? [];
  const studentId = formValues.studentId.trim();
  const studentEmail = formValues.email.trim().toLowerCase();
  const alreadyRegistered = currentRegistrations.some(
    (registration) =>
      registration.studentId === studentId ||
      registration.studentEmail?.trim().toLowerCase() === studentEmail
  );

  if (alreadyRegistered) {
    return {
      success: false,
      message: "You are already registered for this event."
    };
  }

  const remainingSeats = targetEvent.capacity - currentRegistrations.length;

  if (remainingSeats <= 0) {
    return {
      success: false,
      message: "This event is already full. Please choose another event."
    };
  }

  const registration = {
    studentId,
    studentName: formValues.studentName.trim(),
    studentEmail,
    department: formValues.department.trim(),
    course: formValues.course.trim()
  };

  targetEvent.registrations.push(registration);

  return {
    success: true,
    message: "Registration successful. Your seat has been reserved.",
    data: registration
  };
}
