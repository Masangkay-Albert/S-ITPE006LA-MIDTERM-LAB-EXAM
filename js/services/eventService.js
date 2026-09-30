import { events as mockEvents } from "../data/events.js";

/**
 * Fetch events from SQLite database API endpoint, falling back to mock dataset if offline.
 */
export async function getEvents() {
  try {
    const response = await fetch("/api/events");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("[EventService] Database API unavailable, falling back to local dataset:", err.message);
  }

  return [...mockEvents];
}

/**
 * Register student for an event via SQLite database API endpoint.
 * Triggers database-level unique constraints and capacity triggers.
 */
export async function registerStudentForEvent(eventId, formValues) {
  try {
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        eventId,
        studentName: formValues.studentName,
        studentId: formValues.studentId,
        email: formValues.email,
        department: formValues.department,
        course: formValues.course
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        message: result.message || "Registration successful. Your seat has been reserved.",
        data: result.data
      };
    }

    if (result && result.message) {
      return {
        success: false,
        message: result.message
      };
    }
  } catch (err) {
    console.warn("[EventService] API error, falling back to client validation:", err.message);
  }

  // Fallback client-side registration handler for static file preview
  const targetEvent = mockEvents.find((event) => event.id === eventId);

  if (!targetEvent) {
    return {
      success: false,
      message: "Selected event could not be found."
    };
  }

  const currentRegistrations = targetEvent.registrations ?? [];
  const studentId = (formValues.studentId || "").trim();
  const studentEmail = (formValues.email || "").trim().toLowerCase();
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
