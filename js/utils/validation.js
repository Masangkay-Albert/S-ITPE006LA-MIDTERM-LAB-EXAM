export const ALLOWED_EMAIL_DOMAINS = [
  "@univ.edu.ph",
  "@dlsud.edu.ph",
  "@campus.edu",
  "@cityu.edu",
  "@edu.ph"
];

/**
 * Sanitizes input string to prevent XSS.
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Validates institutional student email.
 * @param {string} email 
 * @param {string[]} allowedDomains 
 * @returns {boolean}
 */
export function validateStudentEmail(email, allowedDomains = ALLOWED_EMAIL_DOMAINS) {
  if (!email || typeof email !== 'string') return false;
  const val = email.trim().toLowerCase();
  const rfcEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!rfcEmailPattern.test(val)) return false;
  return allowedDomains.some((domain) => val.endsWith(domain.toLowerCase()));
}

/**
 * Validates student ID format and academic year bounds.
 * @param {string} studentId 
 * @returns {boolean}
 */
export function validateStudentId(studentId) {
  if (!studentId || typeof studentId !== 'string') return false;
  const idPattern = /^(20[1-3][0-9])-(\d{5})$/;
  const match = studentId.trim().match(idPattern);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  return year >= 2015 && year <= 2030;
}

/**
 * Validates student full name length and character constraints.
 * @param {string} name 
 * @returns {boolean}
 */
export function validateStudentName(name) {
  if (!name || typeof name !== 'string') return false;
  const val = name.trim();
  if (val.length < 2 || val.length > 100) return false;
  return /^[a-zA-ZÀ-ÿ\s'.\-]+$/.test(val);
}

/**
 * Validates an individual form field.
 * @param {string} fieldName 
 * @param {string} value 
 * @returns {string|null} Error message or null if valid.
 */
export function validateField(fieldName, value) {
  const val = sanitizeInput(value);

  switch (fieldName) {
    case "studentName": {
      if (!val) return "Please enter your full name.";
      if (val.length < 2) return "Full name must be at least 2 characters.";
      if (val.length > 100) return "Full name cannot exceed 100 characters.";
      if (!/^[a-zA-ZÀ-ÿ\s'.\-]+$/.test(val)) return "Name can only contain letters, spaces, hyphens, and apostrophes.";
      return null;
    }

    case "studentId": {
      if (!val) return "Please enter your student ID.";
      const idPattern = /^(20[1-3][0-9])-(\d{5})$/;
      const match = val.match(idPattern);
      if (!match) return "Student ID must follow the format YYYY-XXXXX (e.g. 2024-10081).";
      const year = parseInt(match[1], 10);
      if (year < 2015 || year > 2030) return "Student ID year must be between 2015 and 2030.";
      return null;
    }

    case "email": {
      if (!val) return "Please enter your institutional email.";
      const rfcEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!rfcEmailPattern.test(val)) return "Enter a valid email address format.";
      const lower = val.toLowerCase();
      const hasValidDomain = ALLOWED_EMAIL_DOMAINS.some((domain) => lower.endsWith(domain));
      if (!hasValidDomain) {
        return "Must use an authorized campus email (e.g. @univ.edu.ph, @cityu.edu, @campus.edu).";
      }
      return null;
    }

    case "department": {
      if (!val) return "Please select or enter your department / college.";
      if (val.length < 2) return "Department name must be at least 2 characters.";
      if (val.length > 100) return "Department name cannot exceed 100 characters.";
      return null;
    }

    case "course": {
      if (!val) return "Please enter your degree program / year level.";
      if (val.length < 2) return "Course / year level must be at least 2 characters.";
      if (val.length > 100) return "Course / year level cannot exceed 100 characters.";
      return null;
    }

    default:
      return null;
  }
}

/**
 * Validates the full registration form payload.
 * @param {Record<string, string>} values 
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateRegistrationForm(values) {
  const errors = {};
  const fields = ["studentName", "studentId", "email", "department", "course"];

  fields.forEach((field) => {
    const error = validateField(field, values[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

