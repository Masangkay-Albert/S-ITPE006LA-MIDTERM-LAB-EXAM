export function renderRegistrationForm(event, { onCancel, onSubmit } = {}) {
  return `
    <div class="form-panel">
      <h2 id="modalTitle">Register for ${event.title}</h2>
      <p>Complete your student credentials to reserve a seat.</p>

      <form id="registrationForm" class="registration-form" novalidate>
        <div class="field-row">
          <div class="form-field">
            <label for="studentName">Full name <span class="required" aria-hidden="true">*</span></label>
            <input 
              id="studentName" 
              name="studentName" 
              type="text" 
              required
              minlength="2"
              maxlength="100"
              aria-required="true"
              aria-label="Full name" 
              aria-invalid="false" 
              aria-describedby="studentNameError"
              placeholder="e.g. Alicia Santos" 
              autocomplete="name"
            />
            <span class="field-error" id="studentNameError" role="alert" aria-live="polite"></span>
          </div>

          <div class="form-field">
            <label for="studentId">Student ID <span class="required" aria-hidden="true">*</span></label>
            <input 
              id="studentId" 
              name="studentId" 
              type="text" 
              required
              minlength="10"
              maxlength="10"
              aria-required="true"
              aria-label="Student ID" 
              aria-invalid="false" 
              aria-describedby="studentIdError"
              placeholder="2024-10081" 
              pattern="^20[1-3][0-9]-\\d{5}$"
              autocomplete="off"
            />
            <span class="field-error" id="studentIdError" role="alert" aria-live="polite"></span>
          </div>
        </div>

        <div class="field-row">
          <div class="form-field">
            <label for="email">Campus email <span class="required" aria-hidden="true">*</span></label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required
              maxlength="255"
              aria-required="true"
              aria-label="Campus email address" 
              aria-invalid="false" 
              aria-describedby="emailError"
              placeholder="student@cityu.edu" 
              autocomplete="email"
            />
            <span class="field-error" id="emailError" role="alert" aria-live="polite"></span>
          </div>

          <div class="form-field">
            <label for="department">Department / College <span class="required" aria-hidden="true">*</span></label>
            <input 
              id="department" 
              name="department" 
              type="text" 
              required
              minlength="2"
              maxlength="100"
              aria-required="true"
              aria-label="Department or College" 
              aria-invalid="false" 
              aria-describedby="departmentError"
              placeholder="e.g. Computer Science" 
              autocomplete="organization"
            />
            <span class="field-error" id="departmentError" role="alert" aria-live="polite"></span>
          </div>
        </div>

        <div class="form-field">
          <label for="course">Degree program & year level <span class="required" aria-hidden="true">*</span></label>
          <input 
            id="course" 
            name="course" 
            type="text" 
            required
            minlength="2"
            maxlength="100"
            aria-required="true"
            aria-label="Degree program and year level" 
            aria-invalid="false" 
            aria-describedby="courseError"
            placeholder="e.g. BS Information Technology - 4th Year" 
          />
          <span class="field-error" id="courseError" role="alert" aria-live="polite"></span>
        </div>

        <div class="form-actions">
          <button type="button" class="back-button" id="cancelRegistration">Cancel</button>
          <button type="submit" class="submit-button" id="submitRegistrationBtn">Submit registration</button>
        </div>
      </form>
    </div>
  `;
}
