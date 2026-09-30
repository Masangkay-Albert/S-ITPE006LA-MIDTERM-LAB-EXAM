using System;
using Xunit;
using Moq;
using CampusEventManagement.Backend;

namespace CampusEventManagement.Tests
{
    public class RegistrationServiceTests
    {
        private readonly RegistrationService _service;

        public RegistrationServiceTests()
        {
            _service = new RegistrationService("Server=dummy;Database=dummy;");
        }

        #region Email Validation Unit Tests (Shift-Left Validation)

        [Theory]
        [InlineData("student.alen@univ.edu.ph", true)]
        [InlineData("john.masangkay@univ.edu.ph", true)]
        [InlineData("lenard.ramos@univ.edu.ph", true)]
        [InlineData("invalid.student@gmail.com", false)]
        [InlineData("attacker@malicious.domain.com", false)]
        [InlineData("student@univ.edu.ph.fake.com", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void ValidateStudentEmail_ShouldEnforceInstitutionalDomain(string email, bool expectedResult)
        {
            // Act
            bool result = _service.ValidateStudentEmail(email, "@univ.edu.ph");

            // Assert
            Assert.Equal(expectedResult, result);
        }

        #endregion

        #region Student ID & Name Validation Unit Tests

        [Theory]
        [InlineData("2024-10081", true)]
        [InlineData("2015-00001", true)]
        [InlineData("2030-99999", true)]
        [InlineData("2014-12345", false)]
        [InlineData("2031-12345", false)]
        [InlineData("2024-1234", false)]
        [InlineData("INVALID-ID", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void ValidateStudentId_ShouldEnforceFormatAndYearBounds(string studentId, bool expectedResult)
        {
            // Act
            bool result = _service.ValidateStudentId(studentId);

            // Assert
            Assert.Equal(expectedResult, result);
        }

        [Theory]
        [InlineData("Alicia Santos", true)]
        [InlineData("Mary-Jane O'Connor", true)]
        [InlineData("A", false)]
        [InlineData("John Doe 123", false)]
        [InlineData("<script>", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void ValidateStudentName_ShouldEnforceAlphabeticAndLengthBounds(string name, bool expectedResult)
        {
            // Act
            bool result = _service.ValidateStudentName(name);

            // Assert
            Assert.Equal(expectedResult, result);
        }

        #endregion

        #region Seat Availability Unit Tests

        [Theory]
        [InlineData(0, 50, true)]   // Empty event -> available
        [InlineData(49, 50, true)]  // 1 seat remaining -> available
        [InlineData(50, 50, false)] // Full capacity -> sold out
        [InlineData(55, 50, false)] // Over-capacity -> rejected
        [InlineData(0, 0, false)]   // Zero capacity -> invalid
        public void VerifySeatAvailability_ShouldEnforceCapacityLimits(int currentRegistrations, int capacity, bool expectedResult)
        {
            // Act
            bool result = _service.VerifySeatAvailability(currentRegistrations, capacity);

            // Assert
            Assert.Equal(expectedResult, result);
        }

        #endregion

        #region Mock Object Dependency Isolation Test

        [Fact]
        public void MockRegistrationService_ShouldIsolateDatabaseCalls()
        {
            // Arrange
            var mockService = new Mock<IRegistrationService>();
            
            mockService.Setup(s => s.ValidateStudentEmail("alen.u@univ.edu.ph", "@univ.edu.ph"))
                       .Returns(true);

            mockService.Setup(s => s.VerifySeatAvailability(10, 50))
                       .Returns(true);

            mockService.Setup(s => s.GetUserRegistration("alen.u@univ.edu.ph"))
                       .Returns("CONFIRMED");

            // Act
            bool isEmailValid = mockService.Object.ValidateStudentEmail("alen.u@univ.edu.ph", "@univ.edu.ph");
            bool hasSeats = mockService.Object.VerifySeatAvailability(10, 50);
            string status = mockService.Object.GetUserRegistration("alen.u@univ.edu.ph");

            // Assert
            Assert.True(isEmailValid);
            Assert.True(hasSeats);
            Assert.Equal("CONFIRMED", status);
            mockService.Verify(s => s.GetUserRegistration("alen.u@univ.edu.ph"), Times.Once());
        }

        #endregion
    }
}
