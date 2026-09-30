using System;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Text.RegularExpressions;

namespace CampusEventManagement.Backend
{
    public interface IRegistrationService
    {
        bool ValidateStudentEmail(string email, string requiredDomain = "@univ.edu.ph");
        bool VerifySeatAvailability(int currentRegisteredCount, int maxCapacity);
        string GetUserRegistration(string inputEmail);
    }

    public class RegistrationService : IRegistrationService
    {
        private readonly string _connectionString;

        public RegistrationService(string connectionString = null)
        {
            _connectionString = connectionString ?? "Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;TrustServerCertificate=True;";
        }

        /// <summary>
        /// Validates student email format and institutional domain constraint.
        /// </summary>
        public bool ValidateStudentEmail(string email, string requiredDomain = "@univ.edu.ph")
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            email = email.Trim().ToLowerInvariant();

            // Regex checking standard RFC 5322 format
            var emailRegex = new Regex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$");
            if (!emailRegex.IsMatch(email))
                return false;

            // Domain validation (e.g. @univ.edu.ph or @campus.edu)
            return email.EndsWith(requiredDomain.ToLowerInvariant());
        }

        /// <summary>
        /// Verifies whether event seats are available before processing registration.
        /// </summary>
        public bool VerifySeatAvailability(int currentRegisteredCount, int maxCapacity)
        {
            if (maxCapacity <= 0)
                return false;

            return currentRegisteredCount < maxCapacity;
        }

        /// <summary>
        /// Securely retrieves user registration record using parameterized queries and proper resource disposal.
        /// Fixes OWASP Top 10 SQL Injection and connection pool resource starvation leaks.
        /// </summary>
        public string GetUserRegistration(string inputEmail)
        {
            if (string.IsNullOrWhiteSpace(inputEmail))
                throw new ArgumentException("Email input cannot be null or empty.", nameof(inputEmail));

            // Validate format prior to database dispatch (Shift-Left Validation)
            if (!ValidateStudentEmail(inputEmail, "@univ.edu.ph") && !ValidateStudentEmail(inputEmail, "@campus.edu") && !ValidateStudentEmail(inputEmail, "@cityu.edu"))
            {
                throw new FormatException("Invalid university email domain format.");
            }

            const string query = "SELECT RegistrationStatus FROM Registrations WHERE Email = @Email;";

            // C# 'using' blocks guarantee deterministic disposal of unmanaged database connections and commands
            using (var conn = new SqlConnection(_connectionString))
            {
                using (var cmd = new SqlCommand(query, conn))
                {
                    // Parameterized query prevents SQL Injection attacks
                    cmd.Parameters.Add(new SqlParameter("@Email", SqlDbType.NVarChar, 255)
                    {
                        Value = inputEmail.Trim().ToLowerInvariant()
                    });

                    conn.Open();

                    var result = cmd.ExecuteScalar();
                    return result != null ? result.ToString() : string.Empty;
                }
            }
        }
    }
}
