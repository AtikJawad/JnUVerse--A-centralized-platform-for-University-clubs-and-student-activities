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

const ONBOARDING_HIGHLIGHTS = [
  {
    title: "Official Verification",
    desc: "Your account is validated instantly against verified JnU academic records.",
  },
  {
    title: "One-Click Club Access",
    desc: "Explore, join, and engage with over 30+ university clubs and societies.",
  },
  {
    title: "Campus Activities Hub",
    desc: "RSVP to events, get notifications, and track your campus involvement.",
  },
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
  const [activeTab, setActiveTab] = useState(0);

  const { register } = useAuth();
  const navigate = useNavigate();

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
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

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
    <div className="min-h-screen bg-[#F3FAF5] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans text-slate-800">
      {/* Outer Card Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100/60 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[660px]">
        {/* Left Side: Soft Pastel Green Feature Showcase */}
        <div className="bg-[#EAF6EE] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background blurs */}
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

          {/* Top Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200/70">
              Jagannath University
            </span>
            <span className="text-xs font-medium text-emerald-700/80">
              Student Registration
            </span>
          </div>

          {/* Graphic & Content */}
          <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <div className="absolute inset-4 bg-emerald-200/40 rounded-full animate-pulse" />

              {/* Handcrafted student registration illustration */}
              <svg
                viewBox="0 0 240 240"
                className="w-full h-full relative z-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* ID Badge Card */}
                <rect x="65" y="45" width="110" height="150" rx="10" fill="white" stroke="#047857" strokeWidth="2.5" />
                <rect x="100" y="38" width="40" height="12" rx="4" fill="#1E2837" />
                <circle cx="120" cy="44" r="3" fill="white" />

                {/* Photo Placeholder on ID */}
                <rect x="85" y="65" width="70" height="60" rx="6" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
                <circle cx="120" cy="85" r="14" fill="#047857" />
                <path d="M102 118 C102 105, 138 105, 138 118 Z" fill="#047857" />

                {/* Student Info Lines */}
                <rect x="80" y="140" width="80" height="6" rx="3" fill="#1E293B" />
                <rect x="85" y="152" width="70" height="4" rx="2" fill="#64748B" />
                <rect x="92" y="162" width="56" height="4" rx="2" fill="#94A3B8" />

                {/* Verified Green Check Shield */}
                <circle cx="165" cy="180" r="18" fill="#10B981" stroke="white" strokeWidth="3" />
                <path d="M158 180 L163 185 L173 174" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Floating Elements */}
                <circle cx="48" cy="140" r="10" fill="#A7F3D0" />
                <path d="M48 135 L48 145 M43 140 L53 140" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="195" cy="85" r="12" fill="white" stroke="#6EE7B7" strokeWidth="1.5" />
                <path d="M190 85 L194 89 L201 81" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <h2 className="mt-3 text-xl sm:text-2xl font-bold text-[#1E293B]">
              {ONBOARDING_HIGHLIGHTS[activeTab].title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#475569] max-w-sm leading-relaxed">
              {ONBOARDING_HIGHLIGHTS[activeTab].desc}
            </p>
          </div>

          {/* Dots */}
          <div className="relative z-10 flex items-center justify-center space-x-2 pt-2">
            {ONBOARDING_HIGHLIGHTS.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveTab(index)}
                aria-label={`Go to item ${index + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeTab === index
                    ? "w-7 bg-emerald-600"
                    : "w-2 bg-emerald-200 hover:bg-emerald-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 sm:p-10 md:p-12 flex flex-col justify-between bg-white overflow-y-auto max-h-[800px]">
          <div className="w-full max-w-md mx-auto my-auto">
            {/* Brand Logo Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center space-x-2 mb-1.5">
                <svg
                  className="w-7 h-7 text-emerald-800"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                <span className="text-xl sm:text-2xl font-serif tracking-widest text-[#1E293B] font-semibold">
                  JNU<span className="text-emerald-700 ml-1 font-sans font-bold">VERSE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Create your verified student account
              </p>
            </div>

            {/* Success State */}
            {registrationSuccess ? (
              <div className="text-center space-y-5 py-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Registration Complete</h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
                    Welcome to JnUVerse, <span className="font-semibold text-slate-800">{registrationSuccess.name || "Student"}</span>!
                    Your student record was verified successfully.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#1E2837] hover:bg-[#151D28] text-white font-medium text-sm transition"
                >
                  Proceed to Sign In
                </button>
              </div>
            ) : (
              <>
                {/* General Error Banner */}
                {generalError && (
                  <div
                    role="alert"
                    className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs sm:text-sm flex items-start space-x-2.5"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500"
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
                    <div className="flex-1 font-medium leading-snug break-words">
                      {generalError}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                  {/* Student ID */}
                  <div>
                    <label
                      htmlFor="student_id"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
                    >
                      Student ID
                    </label>
                    <input
                      id="student_id"
                      name="student_id"
                      type="text"
                      disabled={isSubmitting}
                      value={formData.student_id}
                      onChange={handleChange}
                      placeholder="e.g. B220305047"
                      className={`w-full px-3.5 py-2 rounded-lg border ${
                        fieldErrors.student_id ? "border-red-400 bg-red-50/30" : "border-slate-200"
                      } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50`}
                      required
                    />
                    {fieldErrors.student_id && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.student_id}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      disabled={isSubmitting}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. anik12@gmail.com"
                      className={`w-full px-3.5 py-2 rounded-lg border ${
                        fieldErrors.email ? "border-red-400 bg-red-50/30" : "border-slate-200"
                      } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50`}
                      required
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Department & Batch Row */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <label
                        htmlFor="department"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
                      >
                        Department
                      </label>
                      <select
                        id="department"
                        name="department"
                        disabled={isSubmitting}
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-xs sm:text-sm disabled:bg-slate-50"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="batch"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
                      >
                        Batch
                      </label>
                      <input
                        id="batch"
                        name="batch"
                        type="number"
                        min="1"
                        disabled={isSubmitting}
                        value={formData.batch}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50"
                        required
                      />
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        disabled={isSubmitting}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full px-3.5 py-2 rounded-lg border ${
                          fieldErrors.password ? "border-red-400 bg-red-50/30" : "border-slate-200"
                        } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50`}
                        required
                      />
                      {fieldErrors.password && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="password_confirm"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
                      >
                        Confirm
                      </label>
                      <input
                        id="password_confirm"
                        name="password_confirm"
                        type="password"
                        disabled={isSubmitting}
                        value={formData.password_confirm}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full px-3.5 py-2 rounded-lg border ${
                          fieldErrors.password_confirm ? "border-red-400 bg-red-50/30" : "border-slate-200"
                        } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50`}
                        required
                      />
                      {fieldErrors.password_confirm && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password_confirm}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#1E2837] hover:bg-[#151D28] active:bg-[#0F1722] text-white font-medium text-sm transition duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Verifying &amp; Registering...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-slate-500">
                  Already registered?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2 ml-1"
                  >
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
