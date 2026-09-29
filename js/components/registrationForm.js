export function renderRegistrationForm(event, { onCancel, onSubmit } = {}) {
  return `
    <div class="form-panel">
      <h2 id="modalTitle">Register for ${event.title}</h2>
      <p>Complete your details to reserve a seat.</p>

      <form id="registrationForm" class="registration-form" novalidate>
        <div class="field-row">
          <div class="form-field">
            <label for="studentName">Full name</label>
            <input id="studentName" name="studentName" type="text" aria-label="Full name" aria-invalid="false" />
            <span class="field-error" id="studentNameError"></span>
          </div>

          <div class="form-field">
            <label for="studentId">Student ID</label>
            <input id="studentId" name="studentId" type="text" aria-label="Student ID" aria-invalid="false" placeholder="2024-12345" />
            <span class="field-error" id="studentIdError"></span>
          </div>
        </div>

        <div class="field-row">
          <div class="form-field">
            <label for="email">School email</label>
            <input id="email" name="email" type="email" aria-label="School email" aria-invalid="false" placeholder="student@cityu.edu" />
            <span class="field-error" id="emailError"></span>
          </div>

          <div class="form-field">
            <label for="department">Department</label>
            <input id="department" name="department" type="text" aria-label="Department" aria-invalid="false" placeholder="Computer Science" />
            <span class="field-error" id="departmentError"></span>
          </div>
        </div>

        <div class="form-field">
          <label for="course">Course / Year level</label>
          <input id="course" name="course" type="text" aria-label="Course or year level" aria-invalid="false" placeholder="BSCS 3rd Year" />
          <span class="field-error" id="courseError"></span>
        </div>

        <div class="form-actions">
          <button type="button" class="back-button" id="cancelRegistration">Cancel</button>
          <button type="submit" class="submit-button">Submit registration</button>
        </div>
      </form>
    </div>
  `;
}
