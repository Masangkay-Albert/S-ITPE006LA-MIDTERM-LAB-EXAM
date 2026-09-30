export function validateRegistrationForm(values) {
  const errors = {};

  if (!values.studentName || values.studentName.trim().length < 2) {
    errors.studentName = "Please enter your full name.";
  }

  if (!values.studentId || !/^\d{4}-\d{5}$/.test(values.studentId.trim())) {
    errors.studentId = "Use the format YYYY-XXXXX.";
  }

  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid school email address.";
  }

  if (!values.department || values.department.trim().length < 2) {
    errors.department = "Select or enter your department.";
  }

  if (!values.course || values.course.trim().length < 2) {
    errors.course = "Please give your course or year level.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
