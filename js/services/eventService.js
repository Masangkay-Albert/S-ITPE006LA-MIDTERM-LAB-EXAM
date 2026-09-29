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
  const remainingSeats = targetEvent.capacity - currentRegistrations.length;

  if (remainingSeats <= 0) {
    return {
      success: false,
      message: "This event is already full. Please choose another event."
    };
  }

  const registration = {
    studentId: formValues.studentId.trim(),
    studentName: formValues.studentName.trim(),
    studentEmail: formValues.email.trim(),
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
