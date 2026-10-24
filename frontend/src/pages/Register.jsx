import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { extractErrorMessage } from "../services/api";
import Button from "../components/Button";
import Input from "../components/Input";
import ErrorAlert from "../components/ErrorAlert";
import Badge from "../components/Badge";
import JnUHubMark from "../components/JnUHubMark";

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

const HIGHLIGHT_DESCRIPTIONS = [
  "Directly synced with departmental councils and 40+ campus guilds for seamless event access.",
  "Official institutional account verified against Jagannath University academic registrar records.",
  "Discover student research societies, debating clubs, cultural wings, and career guilds in one place.",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Load official departments from backend API
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

  // Slide interval for left presentation card highlights
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HIGHLIGHT_DESCRIPTIONS.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Auto-infer batch from student ID (e.g. B220305047 -> Batch 22)
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

    if (!agreedToTerms) {
      setGeneralError(
        "Please accept the Campus Guidelines and Privacy Standards to proceed."
      );
      return;
    }

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
    <div className="min-h-screen bg-canvas-base flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      {/* Top Header */}
      <header className="w-full bg-surface-white/80 backdrop-blur-xl border-b border-border-subtle sticky top-0 z-50">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <JnUHubMark variant="header" className="group-hover:scale-105" />
              <span className="text-xl font-bold tracking-tight text-on-surface">
                JnU<span className="text-primary">Verse</span>
              </span>
            </Link>
            <Badge variant="primary" dot className="hidden sm:inline-flex">
              Community Gateway
            </Badge>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-primary hover:bg-surface-lavender transition-all"
          >
            <span>Back to Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start">
          {/* ============================================================= */}
          {/* LEFT SIDE (Desktop): JnUVerse Orbital Showcase Illustration   */}
          {/* On mobile: displayed below the form via order-2               */}
          {/* ============================================================= */}
          <div className="lg:col-span-6 xl:col-span-7 order-2 lg:order-1 w-full flex justify-center">
            <div className="w-full max-w-[580px] lg:max-w-none rounded-3xl lg:rounded-[2.5rem] bg-gradient-to-b from-[#e8ecff] via-[#f0f3ff] to-[#e4e9fc] border border-white/80 p-6 sm:p-8 xl:p-10 shadow-elevated flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[520px] sm:min-h-[560px] lg:min-h-[600px]">
              {/* Soft ambient inner glows */}
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

              {/* Top Showcase Headline & Statistics Badges */}
              <div className="relative z-10 w-full text-center flex flex-col items-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                  Connect, Learn &amp;{" "}
                  <span className="text-primary font-extrabold">Belong</span>
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-white/90 backdrop-blur-md text-on-surface font-semibold text-xs shadow-xs border border-border-subtle">
                    <span className="font-extrabold text-on-surface">4,200+</span>{" "}
                    Enrolled Students
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-white/90 backdrop-blur-md text-primary font-semibold text-xs shadow-xs border border-border-subtle">
                    <span className="font-extrabold text-primary">40+</span> Campus
                    Guilds
                  </span>
                </div>
              </div>

              {/* Central Orbital Network Canvas */}
              <div className="relative z-10 w-full flex items-center justify-center my-auto py-6">
                <div className="relative w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] flex items-center justify-center">
                  {/* Outer Orbital Ring */}
                  <div className="absolute inset-0 rounded-full border border-primary/15 pointer-events-none" />
                  {/* Middle Orbital Ring */}
                  <div className="absolute inset-[44px] sm:inset-[54px] rounded-full border border-primary/20 pointer-events-none" />
                  {/* Inner Orbital Ring */}
                  <div className="absolute inset-[88px] sm:inset-[108px] rounded-full border border-primary/25 pointer-events-none" />

                  {/* Central Planet Hub (Consistent with Login Page Hub Mark) */}
                  <JnUHubMark variant="orbital" />

                  {/* Orbit Node 1: Top-Left - JnU IT Club */}
                  <div className="absolute top-[28px] left-[35px] sm:top-[36px] sm:left-[45px] z-20 pointer-events-auto">
                    <div className="animate-orbit-float-2">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-white flex items-center justify-center shadow-resting border-2 border-white hover:scale-110 hover:shadow-elevated transition-all duration-200 cursor-pointer"
                          title="JnU IT Club"
                        >
                          <span className="material-symbols-outlined text-[20px] text-[#2b34b9]">
                            terminal
                          </span>
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-surface-white/95 text-[10px] font-semibold text-on-surface shadow-xs whitespace-nowrap">
                          JnU IT Club
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orbit Node 2: Top-Right - Debating Society */}
                  <div className="absolute top-[32px] right-[40px] sm:top-[42px] sm:right-[50px] z-20 pointer-events-auto">
                    <div className="animate-orbit-float-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-white flex items-center justify-center shadow-resting border-2 border-white hover:scale-110 hover:shadow-elevated transition-all duration-200 cursor-pointer"
                          title="JnU Debating Society"
                        >
                          <span className="material-symbols-outlined text-[20px] text-[#4285F4]">
                            record_voice_over
                          </span>
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-surface-white/95 text-[10px] font-semibold text-on-surface shadow-xs whitespace-nowrap">
                          Debating Society
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orbit Node 3: Middle-Left - Photo Club */}
                  <div className="absolute top-[135px] left-[6px] sm:top-[160px] sm:left-[12px] z-20 pointer-events-auto">
                    <div className="animate-orbit-float-5">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-white flex items-center justify-center shadow-resting border-2 border-white hover:scale-110 hover:shadow-elevated transition-all duration-200 cursor-pointer"
                          title="JnU Photographic Society"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#EA4335]">
                            photo_camera
                          </span>
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-surface-white/95 text-[9px] font-semibold text-on-surface shadow-xs whitespace-nowrap">
                          Photo Club
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orbit Node 4: Middle-Right - Cultural Cell */}
                  <div className="absolute top-[140px] right-[8px] sm:top-[165px] sm:right-[15px] z-20 pointer-events-auto">
                    <div className="animate-orbit-float-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-white flex items-center justify-center shadow-resting border-2 border-white hover:scale-110 hover:shadow-elevated transition-all duration-200 cursor-pointer"
                          title="JnU Cultural Council"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#9333ea]">
                            theater_comedy
                          </span>
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-surface-white/95 text-[9px] font-semibold text-on-surface shadow-xs whitespace-nowrap">
                          Cultural Cell
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orbit Node 5: Bottom-Center - Athletics Wing */}
                  <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                    <div className="animate-orbit-float-7">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-white flex items-center justify-center shadow-resting border-2 border-white hover:scale-110 hover:shadow-elevated transition-all duration-200 cursor-pointer"
                          title="JnU Sports & Athletics Wing"
                        >
                          <span className="material-symbols-outlined text-[20px] text-[#d97706]">
                            sports_soccer
                          </span>
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-md bg-surface-white/95 text-[10px] font-semibold text-on-surface shadow-xs whitespace-nowrap">
                          Athletics Wing
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Summary & Description (Consistent with Registration Stitch Reference) */}
              <div className="relative z-10 w-full text-center max-w-md pt-2 flex flex-col items-center space-y-3">
                <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
                  {HIGHLIGHT_DESCRIPTIONS[activeSlide]}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {HIGHLIGHT_DESCRIPTIONS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveSlide(i)}
                      aria-label={`Show slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeSlide === i ? "w-6 bg-primary" : "w-2 bg-primary/25"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT SIDE (Desktop): Complete Student Registration Form      */}
          {/* On mobile: displayed first (order-1) for quick accessibility  */}
          {/* ============================================================= */}
          <div className="lg:col-span-6 xl:col-span-5 order-1 lg:order-2 flex flex-col justify-start max-w-xl mx-auto lg:mx-0 w-full pt-1 lg:pt-0">
            {/* Success State */}
            {registrationSuccess ? (
              <div className="bg-surface-white border border-border-subtle rounded-3xl p-8 text-center shadow-resting space-y-5">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[30px]">
                    check_circle
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-on-surface">
                    Registration Complete!
                  </h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">
                    Welcome to JnUVerse,{" "}
                    <strong className="text-on-surface font-semibold">
                      {registrationSuccess.name || "Student"}
                    </strong>
                    ! Your student record was verified successfully against official
                    registrar records.
                  </p>
                  {registrationSuccess.student_id && (
                    <div className="mt-4 inline-block bg-surface-lavender border border-border-subtle rounded-xl px-4 py-2 text-xs font-mono text-on-surface">
                      Student ID: {registrationSuccess.student_id} | Batch:{" "}
                      {registrationSuccess.batch}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => navigate("/login")}
                  variant="primary"
                  className="w-full h-11"
                >
                  Proceed to Sign In
                </Button>
              </div>
            ) : (
              <>
                {/* Main Title & Subtitle */}
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                    Create your account<span className="text-primary">.</span>
                  </h1>
                  <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                    Register with your Jagannath University credentials to access
                    campus guilds, councils, and student resources.
                  </p>
                </div>

                {/* General DRF Error Banner */}
                <ErrorAlert
                  message={generalError}
                  onDismiss={() => setGeneralError("")}
                  className="mb-5"
                />

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Row 1: Student ID & Batch (3-Column Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Student ID"
                        id="student_id"
                        name="student_id"
                        type="text"
                        disabled={isSubmitting}
                        value={formData.student_id}
                        onChange={handleChange}
                        placeholder="e.g. B220305047"
                        required
                        error={fieldErrors.student_id}
                        helperText="Format: B220305047"
                        icon={
                          <span className="material-symbols-outlined text-[20px]">
                            badge
                          </span>
                        }
                      />
                    </div>
                    <div>
                      <Input
                        label="Batch"
                        id="batch"
                        name="batch"
                        type="number"
                        min="1"
                        disabled={isSubmitting}
                        value={formData.batch}
                        onChange={handleChange}
                        required
                        error={fieldErrors.batch}
                        helperText="e.g. 22"
                        icon={
                          <span className="material-symbols-outlined text-[20px]">
                            school
                          </span>
                        }
                      />
                    </div>
                  </div>

                  {/* Row 2: Department Selection (Dynamic from Backend) */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      htmlFor="department"
                      className="block text-xs font-semibold tracking-wide text-on-surface uppercase"
                    >
                      Department <span className="text-error">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-text-muted/70 text-[20px] pointer-events-none">
                        account_balance
                      </span>
                      <select
                        id="department"
                        name="department"
                        disabled={isSubmitting}
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full h-11 pl-11 pr-8 bg-surface-white text-on-surface border border-border-subtle rounded-xl font-normal text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-xs disabled:bg-surface-lavender/40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.department && (
                      <p className="text-xs font-medium text-error mt-0.5">
                        {fieldErrors.department}
                      </p>
                    )}
                  </div>

                  {/* Row 3: Institutional Email Address */}
                  <Input
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    disabled={isSubmitting}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. student@student.jnu.ac.bd"
                    required
                    error={fieldErrors.email}
                    helperText="@student.jnu.ac.bd preferred (must match registrar on-file record)"
                    icon={
                      <span className="material-symbols-outlined text-[20px]">
                        alternate_email
                      </span>
                    }
                  />

                  {/* Row 4: Password & Confirm Password (2-Column Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        label="Password"
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        disabled={isSubmitting}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 8 chars"
                        required
                        error={fieldErrors.password}
                        icon={
                          <span className="material-symbols-outlined text-[19px]">
                            lock
                          </span>
                        }
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-9 text-text-muted/70 hover:text-on-surface p-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        label="Confirm Password"
                        id="password_confirm"
                        name="password_confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        disabled={isSubmitting}
                        value={formData.password_confirm}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        required
                        error={fieldErrors.password_confirm}
                        icon={
                          <span className="material-symbols-outlined text-[19px]">
                            verified_user
                          </span>
                        }
                      />
                      <button
                        type="button"
                        aria-label="Toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-9 text-text-muted/70 hover:text-on-surface p-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Agreement Checkbox */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      name="terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-0 accent-primary cursor-pointer border-border-subtle"
                    />
                    <label
                      htmlFor="terms"
                      className="text-xs text-text-muted leading-tight cursor-pointer select-none"
                    >
                      I accept the{" "}
                      <span className="text-primary font-medium hover:underline">
                        Campus Guidelines
                      </span>{" "}
                      and{" "}
                      <span className="text-primary font-medium hover:underline">
                        Privacy Standards
                      </span>
                      .
                    </label>
                  </div>

                  {/* Primary CTA Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isSubmitting}
                      className="w-full h-12 rounded-full font-bold shadow-resting hover:shadow-elevated"
                    >
                      <span>Create JnU Account</span>
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </Button>
                  </div>
                </form>

                {/* Footer Switcher */}
                <div className="pt-6 mt-6 border-t border-border-subtle space-y-2 text-center">
                  <p className="text-sm text-text-muted">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-bold text-primary hover:underline ml-1"
                    >
                      Log in
                    </Link>
                  </p>
                  <p className="text-xs text-text-muted">
                    Registering a club instead?{" "}
                    <Link
                      to="/register/club"
                      className="font-bold text-primary hover:underline ml-1"
                    >
                      Register as a Club Operator
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-white/60 border-t border-border-subtle py-4">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>&copy; 2026 Jagannath University (JnU). All rights reserved.</span>
          <div className="flex items-center gap-6">
            <span>Centralized Student &amp; Club Portal</span>
            <span>Registrar Sync Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
