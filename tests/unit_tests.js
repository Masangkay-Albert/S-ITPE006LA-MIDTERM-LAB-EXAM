import assert from 'node:assert/strict';

// Core Validation Routine Implementation
export function validateStudentEmail(email, requiredDomain = "@univ.edu.ph") {
  if (!email || typeof email !== 'string') return false;
  email = email.trim().toLowerCase();
  const rfcRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!rfcRegex.test(email)) return false;
  return email.endsWith(requiredDomain.toLowerCase());
}

export function verifySeatAvailability(currentRegisteredCount, maxCapacity) {
  if (typeof maxCapacity !== 'number' || maxCapacity <= 0) return false;
  if (typeof currentRegisteredCount !== 'number' || currentRegisteredCount < 0) return false;
  return currentRegisteredCount < maxCapacity;
}

// Mock Object Factory
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
assert.equal(validateStudentEmail("alen.u@univ.edu.ph", "@univ.edu.ph"), true, "Valid @univ.edu.ph email should pass");
assert.equal(validateStudentEmail("john.masangkay@univ.edu.ph", "@univ.edu.ph"), true, "Valid name email should pass");
assert.equal(validateStudentEmail("lenard.ramos@univ.edu.ph", "@univ.edu.ph"), true, "Valid faculty email should pass");
assert.equal(validateStudentEmail("attacker@gmail.com", "@univ.edu.ph"), false, "Non-university email must be rejected");
assert.equal(validateStudentEmail("student@univ.edu.ph.malicious.com", "@univ.edu.ph"), false, "Spoofed domain suffix must be rejected");
assert.equal(validateStudentEmail("", "@univ.edu.ph"), false, "Empty email must be rejected");
assert.equal(validateStudentEmail(null, "@univ.edu.ph"), false, "Null email must be rejected");
console.log('  ✅ 7/7 Email Validation Tests Passed');
passed += 7;

// Test Suite 2: Seat Capacity Limits
console.log('\n--- Test Suite 2: Seat Availability & Capacity Bounds ---');
assert.equal(verifySeatAvailability(0, 50), true, "Empty event should have seats available");
assert.equal(verifySeatAvailability(49, 50), true, "Event with 1 remaining seat should allow registration");
assert.equal(verifySeatAvailability(50, 50), false, "Event at full capacity must reject registration");
assert.equal(verifySeatAvailability(55, 50), false, "Overbooked event must reject registration");
assert.equal(verifySeatAvailability(0, 0), false, "Zero capacity event must be invalid");
console.log('  ✅ 5/5 Capacity Verification Tests Passed');
passed += 5;

// Test Suite 3: Mock Object Isolation & Dependency Injection
console.log('\n--- Test Suite 3: Mock Object Dependency Isolation ---');
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

  console.log(`\n🎉 All ${passed} Shift-Left Unit Tests successfully executed and passed!\n`);
})();
