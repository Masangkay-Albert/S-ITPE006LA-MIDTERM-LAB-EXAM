import assert from 'node:assert/strict';
import { 
  validateStudentEmail, 
  validateStudentId, 
  validateStudentName, 
  validateField, 
  validateRegistrationForm,
  ALLOWED_EMAIL_DOMAINS 
} from '../js/utils/validation.js';

export function verifySeatAvailability(currentRegisteredCount, maxCapacity) {
  if (typeof maxCapacity !== 'number' || maxCapacity <= 0) return false;
  if (typeof currentRegisteredCount !== 'number' || currentRegisteredCount < 0) return false;
  return currentRegisteredCount < maxCapacity;
}

// Mock Object Factory for Unit Testing
export function createMockRegistrationRepository(initialRegistrations = []) {
  const store = new Map(initialRegistrations.map(r => [`${r.eventId}:${r.email}`, r]));
  let callCount = 0;

  return {
    findRegistration: async (eventId, email) => {
      callCount++;
      return store.get(`${eventId}:${email.toLowerCase()}`) || null;
    },
    countConfirmedRegistrations: async (eventId) => {
      callCount++;
      let count = 0;
      for (const r of store.values()) {
        if (r.eventId === eventId && r.status !== 'CANCELLED') count++;
      }
      return count;
    },
    insertRegistration: async (registration) => {
      callCount++;
      const key = `${registration.eventId}:${registration.email.toLowerCase()}`;
      if (store.has(key)) throw new Error("Unique constraint violation: Duplicate registration");
      store.set(key, registration);
      return registration;
    },
    getCallCount: () => callCount
  };
}

// Test Runner
console.log('\n======================================================');
console.log('  🧪 Running Shift-Left Unit & Security Tests (Task 4)');
console.log('======================================================\n');

let passed = 0;

// Test Suite 1: Email Domain Validation
console.log('--- Test Suite 1: Institutional Email Domain Validation ---');
assert.equal(validateStudentEmail("alen.u@univ.edu.ph"), true, "Valid @univ.edu.ph email should pass");
assert.equal(validateStudentEmail("john.masangkay@dlsud.edu.ph"), true, "Valid @dlsud.edu.ph email should pass");
assert.equal(validateStudentEmail("lenard.ramos@campus.edu"), true, "Valid @campus.edu email should pass");
assert.equal(validateStudentEmail("alicia.santos@cityu.edu"), true, "Valid @cityu.edu email should pass");
assert.equal(validateStudentEmail("attacker@gmail.com"), false, "Non-university public email must be rejected");
assert.equal(validateStudentEmail("student@univ.edu.ph.malicious.com"), false, "Spoofed domain suffix must be rejected");
assert.equal(validateStudentEmail("user@@univ.edu.ph"), false, "Double '@' malformed syntax must be rejected");
assert.equal(validateStudentEmail(""), false, "Empty email must be rejected");
assert.equal(validateStudentEmail(null), false, "Null email must be rejected");
console.log('  ✅ 9/9 Email Validation Tests Passed');
passed += 9;

// Test Suite 2: Student ID Format & Boundary Validation
console.log('\n--- Test Suite 2: Student ID Format & Academic Year Bounds ---');
assert.equal(validateStudentId("2024-10081"), true, "Valid 2024 student ID should pass");
assert.equal(validateStudentId("2015-00001"), true, "Lower boundary 2015 student ID should pass");
assert.equal(validateStudentId("2030-99999"), true, "Upper boundary 2030 student ID should pass");
assert.equal(validateStudentId("2014-12345"), false, "Out-of-range year 2014 (< 2015) must be rejected");
assert.equal(validateStudentId("2031-12345"), false, "Out-of-range year 2031 (> 2030) must be rejected");
assert.equal(validateStudentId("2024-1234"), false, "4-digit suffix (< 5 digits) must be rejected");
assert.equal(validateStudentId("2024-123456"), false, "6-digit suffix (> 5 digits) must be rejected");
assert.equal(validateStudentId("INVALID-ID"), false, "Non-numeric ID format must be rejected");
assert.equal(validateStudentId(""), false, "Empty student ID must be rejected");
console.log('  ✅ 9/9 Student ID Validation Tests Passed');
passed += 9;

// Test Suite 3: Student Name & Character Sanitization Validation
console.log('\n--- Test Suite 3: Student Full Name & Character Validation ---');
assert.equal(validateStudentName("Alicia Santos"), true, "Standard name with space should pass");
assert.equal(validateStudentName("Mary-Jane O'Connor"), true, "Name with hyphen and apostrophe should pass");
assert.equal(validateStudentName("José Peña"), true, "Name with accented Latin characters should pass");
assert.equal(validateStudentName("A"), false, "Single character name (< 2 chars) must be rejected");
assert.equal(validateStudentName("a".repeat(101)), false, "Name exceeding 100 characters must be rejected");
assert.equal(validateStudentName("<script>alert('xss')</script>"), false, "XSS script tags must be rejected");
assert.equal(validateStudentName("John Doe 123"), false, "Name with numeric digits must be rejected");
assert.equal(validateStudentName(""), false, "Empty name must be rejected");
console.log('  ✅ 8/8 Student Name Validation Tests Passed');
passed += 8;

// Test Suite 4: Form Payload Validator (validateRegistrationForm)
console.log('\n--- Test Suite 4: Complete Registration Payload Validation ---');
const validPayload = {
  studentName: "Alen Umandal",
  studentId: "2024-10081",
  email: "alen.u@univ.edu.ph",
  department: "College of Computer and Information Sciences",
  course: "BS Information Technology - 4th Year"
};
const validResult = validateRegistrationForm(validPayload);
assert.equal(validResult.isValid, true, "Valid registration form payload should return isValid = true");
assert.equal(Object.keys(validResult.errors).length, 0, "Valid payload should have 0 error messages");

const invalidPayload = {
  studentName: "X",
  studentId: "1999-12345",
  email: "attacker@gmail.com",
  department: "",
  course: ""
};
const invalidResult = validateRegistrationForm(invalidPayload);
assert.equal(invalidResult.isValid, false, "Invalid payload must return isValid = false");
assert.ok(invalidResult.errors.studentName, "Errors dictionary should flag studentName");
assert.ok(invalidResult.errors.studentId, "Errors dictionary should flag studentId");
assert.ok(invalidResult.errors.email, "Errors dictionary should flag email");
assert.ok(invalidResult.errors.department, "Errors dictionary should flag department");
assert.ok(invalidResult.errors.course, "Errors dictionary should flag course");
console.log('  ✅ 7/7 Form Payload Validation Tests Passed');
passed += 7;

// Test Suite 5: Seat Capacity Limits
console.log('\n--- Test Suite 5: Seat Availability & Capacity Bounds ---');
assert.equal(verifySeatAvailability(0, 50), true, "Empty event should have seats available");
assert.equal(verifySeatAvailability(49, 50), true, "Event with 1 remaining seat should allow registration");
assert.equal(verifySeatAvailability(50, 50), false, "Event at full capacity must reject registration");
assert.equal(verifySeatAvailability(55, 50), false, "Overbooked event must reject registration");
assert.equal(verifySeatAvailability(0, 0), false, "Zero capacity event must be invalid");
console.log('  ✅ 5/5 Capacity Verification Tests Passed');
passed += 5;

// Test Suite 6: Mock Object Isolation & Dependency Injection
console.log('\n--- Test Suite 6: Mock Object Dependency Isolation ---');
(async () => {
  const mockRepo = createMockRegistrationRepository([
    { eventId: 1, email: 'student1@univ.edu.ph', status: 'CONFIRMED' },
    { eventId: 1, email: 'student2@univ.edu.ph', status: 'CONFIRMED' }
  ]);

  const count = await mockRepo.countConfirmedRegistrations(1);
  assert.equal(count, 2, "Mock repository should report 2 active registrations");

  const isAvailable = verifySeatAvailability(count, 3);
  assert.equal(isAvailable, true, "1 seat available in mock test");

  await mockRepo.insertRegistration({ eventId: 1, email: 'alen.u@univ.edu.ph', status: 'CONFIRMED' });
  const updatedCount = await mockRepo.countConfirmedRegistrations(1);
  assert.equal(updatedCount, 3, "Count should be 3 after mock insert");

  // Attempt duplicate registration in mock
  await assert.rejects(
    async () => {
      await mockRepo.insertRegistration({ eventId: 1, email: 'alen.u@univ.edu.ph', status: 'CONFIRMED' });
    },
    /Duplicate registration/,
    "Mock should reject duplicate registration attempt"
  );

  assert.equal(mockRepo.getCallCount(), 4, "Mock tracked exact number of decoupled calls");
  console.log('  ✅ 4/4 Mock Dependency Isolation Tests Passed');
  passed += 4;

  console.log(`\n🎉 All ${passed} Shift-Left Unit & Validation Tests successfully executed and passed!\n`);
})();

