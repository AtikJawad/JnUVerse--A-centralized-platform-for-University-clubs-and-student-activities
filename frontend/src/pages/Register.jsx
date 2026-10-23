import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { extractErrorMessage } from "../services/api";

const DEFAULT_DEPARTMENTS = [
  "Computer Science and Engineering (CSE)",
  "Accounting and Information Systems (AIS)",
  "Management Studies",
  "Finance",
  "Marketing",
  "Economics",
  "Political Science",
  "Sociology",
  "Social Work",
  "Anthropology",
  "Mass Communication and Journalism",
  "Public Administration",
  "Film and Television",
  "Bangla",
  "English",
  "History",
  "Philosophy",
  "Islamic History and Culture",
  "Islamic Studies",
  "Music",
  "Drama",
  "Fine Arts",
  "Chemistry",
  "Mathematics",
  "Physics",
  "Statistics",
  "Botany",
  "Zoology",
  "Geography & Environment",
  "Psychology",
  "Microbiology",
  "Biochemistry and Molecular Biology",
  "Genetic Engineering and Biotechnology",
  "Pharmacy",
  "Law",
  "Land Management & Law",
  "Institute of Education and Research (IER)",
  "Institute of Modern Languages (IML)",
];

export default function Register() {
  const [formData, setFormData] = useState({
    student_id: "",
    email: "",
    department: DEFAULT_DEPARTMENTS[0],
    batch: 22,
    password: "",
    password_confirm: "",
  });

  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Load department choices from backend if available
  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/auth/departments/")
      .then((res) => {
        if (isMounted && res.data?.departments?.length > 0) {
          setDepartments(res.data.departments);
          setFormData((prev) => ({
            ...prev,
            department: prev.department || res.data.departments[0],
          }));
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_DEPARTMENTS silently
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Helper: If user types student ID, auto-infer batch (e.g. B22... -> 22)
      if (name === "student_id") {
        const match = value.match(/^[A-Za-z]?(\d{2})/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (parsed > 0 && parsed < 100) {
            next.batch = parsed;
          }
        }
      }

      return next;
    });

    // Clear field-specific error as user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    // Client-side quick check
    if (formData.password !== formData.password_confirm) {
      setFieldErrors({ password_confirm: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        student_id: formData.student_id.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department,
        batch: Number(formData.batch),
        password: formData.password,
        password_confirm: formData.password_confirm,
      };

      const result = await register(payload);
      setRegistrationSuccess(result);
    } catch (error) {
      if (error.response?.data && typeof error.response.data === "object") {
        const data = error.response.data;
        const newFieldErrors = {};
        const otherErrors = [];

        Object.entries(data).forEach(([key, val]) => {
          const formattedVal = Array.isArray(val) ? val.join(" ") : String(val);
          if (key === "non_field_errors") {
            otherErrors.push(formattedVal);
          } else if (
            [
              "student_id",
              "email",
              "department",
              "batch",
              "password",
              "password_confirm",
            ].includes(key)
          ) {
            newFieldErrors[key] = formattedVal;
          } else {
            otherErrors.push(`${key}: ${formattedVal}`);
          }
        });

        setFieldErrors(newFieldErrors);
        if (otherErrors.length > 0) {
          setGeneralError(otherErrors.join(" | "));
        } else if (Object.keys(newFieldErrors).length === 0) {
          setGeneralError(extractErrorMessage(error, "Registration failed."));
        }
      } else {
        setGeneralError(
          extractErrorMessage(
            error,
            "Registration failed. Please verify your Student ID and Email."
          )
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-md shadow-indigo-200 mb-3">
            JnU
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Registration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            JnUVerse validates your credentials directly against verified university student records.
          </p>
        </div>

        {/* Success View */}
        {registrationSuccess ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Registration Successful!</h2>
              <p className="mt-2 text-sm text-slate-600">
                Welcome, <span className="font-semibold text-slate-800">{registrationSuccess.name || "Student"}</span>!
                Your student profile has been verified and registered.
              </p>
              {registrationSuccess.student_id && (
                <div className="mt-4 inline-block bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-mono text-slate-700">
                  Student ID: {registrationSuccess.student_id} | Batch: {registrationSuccess.batch}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition"
            >
              Sign In to Your Account
            </button>
          </div>
        ) : (
          /* Registration Form */
          <>
            {generalError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-3 transition-all"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1 font-medium break-words">{generalError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Student ID */}
              <div>
                <label htmlFor="student_id" className="block text-sm font-semibold text-slate-700 mb-1">
                  JnU Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  disabled={isSubmitting}
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="e.g. B220305043"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    fieldErrors.student_id ? "border-red-400 bg-red-50/30" : "border-slate-300"
                  } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  required
                />
                {fieldErrors.student_id && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.student_id}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  disabled={isSubmitting}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@example.com"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    fieldErrors.email ? "border-red-400 bg-red-50/30" : "border-slate-300"
                  } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  Must match your verified student record email on file.
                </p>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Department & Batch Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="department" className="block text-sm font-semibold text-slate-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="department"
                    name="department"
                    disabled={isSubmitting}
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.department && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.department}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="batch" className="block text-sm font-semibold text-slate-700 mb-1">
                    Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="batch"
                    name="batch"
                    type="number"
                    min="1"
                    disabled={isSubmitting}
                    value={formData.batch}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      fieldErrors.batch ? "border-red-400 bg-red-50/30" : "border-slate-300"
                    } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    required
                  />
                  {fieldErrors.batch && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.batch}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  disabled={isSubmitting}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    fieldErrors.password ? "border-red-400 bg-red-50/30" : "border-slate-300"
                  } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  required
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="password_confirm" className="block text-sm font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  disabled={isSubmitting}
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    fieldErrors.password_confirm ? "border-red-400 bg-red-50/30" : "border-slate-300"
                  } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  required
                />
                {fieldErrors.password_confirm && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password_confirm}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Verifying &amp; Registering...</span>
                  </>
                ) : (
                  <span>Register Account</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600">
                Already registered?{" "}
                <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
