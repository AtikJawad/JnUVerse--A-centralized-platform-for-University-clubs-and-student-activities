import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { extractErrorMessage } from "../services/api";
import Input from "../components/Input";
import Button from "../components/Button";
import ErrorAlert from "../components/ErrorAlert";
import JnUHubMark from "../components/JnUHubMark";

const HIGHLIGHT_DESCRIPTIONS = [
  "Built for Event broadcasting, Member management, and automated Council approvals.",
  "Broadcast official society notices and publish campus-wide events with one click.",
  "Streamlined member applications, role delegation, and real-time activity oversight.",
];

export default function RegisterClub() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    club_name: "",
    email: "",
    description: "",
    contact_email: "",
    password: "",
    password_confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Status & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  // Showcase Highlight Carousel Slide (Auto-cycles every 4.5s)
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HIGHLIGHT_DESCRIPTIONS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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
        "Please certify your authorization and agree to the Campus Society Guidelines to proceed."
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
        club_name: formData.club_name.trim(),
        email: formData.email.trim().toLowerCase(),
        description: formData.description.trim(),
        contact_email: formData.contact_email.trim().toLowerCase(),
        password: formData.password,
        password_confirm: formData.password_confirm,
      };

      const response = await api.post("/api/auth/register/club/", payload);
      setRegistrationSuccess(response.data);
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
              "club_name",
              "email",
              "description",
              "contact_email",
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
          setGeneralError(extractErrorMessage(error, "Club registration failed."));
        }
      } else {
        setGeneralError(
          extractErrorMessage(
            error,
            "Registration failed. Please check your club credentials."
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
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <JnUHubMark variant="header" className="group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-on-surface">
              JnU<span className="text-primary">Verse</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content Area: Aligned Two-Column Architecture */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-12">
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
                  Empower Your{" "}
                  <span className="text-primary font-extrabold">Campus Society</span>
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-white/90 backdrop-blur-md text-on-surface font-semibold text-xs shadow-xs border border-border-subtle">
                    <span className="font-extrabold text-primary">40+</span>{" "}
                    Registered Societies
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-white/90 backdrop-blur-md text-primary font-semibold text-xs shadow-xs border border-border-subtle">
                    <span className="font-extrabold text-on-surface">100%</span> Council
                    Synchronized
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

                  {/* Central Planet Hub */}
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

              {/* Bottom Showcase Highlight Carousel */}
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
          {/* RIGHT SIDE (Desktop): Club Operator Registration Form         */}
          {/* On mobile: displayed first via order-1                        */}
          {/* ============================================================= */}
          <div className="lg:col-span-6 xl:col-span-5 order-1 lg:order-2 flex flex-col justify-start max-w-xl mx-auto lg:mx-0 w-full pt-1 lg:pt-0">
            {/* Registration Success State */}
            {registrationSuccess ? (
              <div className="bg-surface-white border border-border-subtle rounded-3xl p-8 text-center shadow-resting space-y-5">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[30px]">
                    check_circle
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-on-surface">
                    Club Registration Complete!
                  </h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">
                    Welcome to JnUVerse! Your society{" "}
                    <strong className="text-on-surface font-semibold">
                      {registrationSuccess.club?.name || formData.club_name}
                    </strong>{" "}
                    and administrative account have been registered successfully.
                  </p>
                  {registrationSuccess.club?.slug && (
                    <div className="mt-4 inline-block bg-surface-lavender border border-border-subtle rounded-xl px-4 py-2 text-xs font-mono text-on-surface">
                      Club: {registrationSuccess.club.name} | Slug:{" "}
                      {registrationSuccess.club.slug}
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
                {/* Clean Form Header — Without unwanted portal badge or sign-in link */}
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                    Register Club Operator<span className="text-primary">.</span>
                  </h1>
                  <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                    Create an official administrative account to manage your university
                    society or club on JnUVerse.
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
                  {/* Row 1: Club Name & Operator Email (2-Column Grid on sm+) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Club Name"
                      id="club_name"
                      name="club_name"
                      type="text"
                      disabled={isSubmitting}
                      value={formData.club_name}
                      onChange={handleChange}
                      placeholder="e.g. JnU IT & Coding Club"
                      required
                      error={fieldErrors.club_name}
                      helperText="Official chartered name recognized by JnU"
                      icon={
                        <span className="material-symbols-outlined text-[20px]">
                          groups
                        </span>
                      }
                    />
                    <Input
                      label="Operator Email"
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      disabled={isSubmitting}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. president@jnuit.org"
                      required
                      error={fieldErrors.email}
                      helperText="Primary administrative login"
                      icon={
                        <span className="material-symbols-outlined text-[20px]">
                          badge
                        </span>
                      }
                    />
                  </div>

                  {/* Row 2: Club Description (Optional Textarea) */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="description"
                        className="block text-xs font-semibold tracking-wide text-on-surface uppercase"
                      >
                        Club Description{" "}
                        <span className="text-text-muted font-normal lowercase">
                          (optional)
                        </span>
                      </label>
                      <span className="text-[11px] text-text-muted">Max 300 words</span>
                    </div>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="Brief overview of your club’s mission, activities, and campus community..."
                      className={`w-full p-3 bg-surface-white text-on-surface placeholder:text-text-muted/50 rounded-xl font-normal text-sm transition-all duration-200 outline-none shadow-xs resize-none leading-relaxed border ${
                        fieldErrors.description
                          ? "border-error bg-error-container/10 focus:border-error focus:ring-2 focus:ring-error/20"
                          : "border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
                      } disabled:bg-surface-lavender/40 disabled:cursor-not-allowed`}
                    />
                    {fieldErrors.description && (
                      <p className="text-xs font-medium text-error mt-0.5">
                        {fieldErrors.description}
                      </p>
                    )}
                  </div>

                  {/* Row 3: Contact Email (Optional) */}
                  <Input
                    label="Contact Email"
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="e.g. contact@jnuit.org or public inquiries email"
                    error={fieldErrors.contact_email}
                    helperText="Publicly displayed on club profile for prospective members"
                    icon={
                      <span className="material-symbols-outlined text-[20px]">
                        contact_mail
                      </span>
                    }
                  />

                  {/* Row 4: Password & Confirm Password (2-Column Grid on sm+) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Password"
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      required
                      error={fieldErrors.password}
                      icon={
                        <span className="material-symbols-outlined text-[20px]">
                          lock
                        </span>
                      }
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-lavender transition"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          <span className="material-symbols-outlined text-[19px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      }
                    />

                    <Input
                      label="Confirm Password"
                      id="password_confirm"
                      name="password_confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      value={formData.password_confirm}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      required
                      error={fieldErrors.password_confirm}
                      icon={
                        <span className="material-symbols-outlined text-[20px]">
                          verified_user
                        </span>
                      }
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-lavender transition"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <span className="material-symbols-outlined text-[19px]">
                            {showConfirmPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      }
                    />
                  </div>

                  {/* Row 5: Authorization & Charter Agreement Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 mt-0.5 rounded border-border-subtle text-primary focus:ring-primary/20 transition cursor-pointer accent-primary"
                      />
                      <span className="text-xs text-text-muted leading-relaxed group-hover:text-on-surface transition">
                        I certify that I am an authorized club executive and agree to comply
                        with the{" "}
                        <span className="text-primary font-medium hover:underline">
                          Campus Society Guidelines
                        </span>{" "}
                        and{" "}
                        <span className="text-primary font-medium hover:underline">
                          Governance Standards
                        </span>
                        .
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isSubmitting}
                      className="w-full h-12 rounded-full font-bold shadow-resting hover:shadow-elevated"
                    >
                      <span>Register Club Operator</span>
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </Button>
                  </div>
                </form>

                {/* Footer Navigation Switcher */}
                <div className="pt-6 mt-6 border-t border-border-subtle space-y-2 text-center text-sm text-text-muted">
                  <p>
                    Already registered?{" "}
                    <Link
                      to="/operator/login"
                      className="font-bold text-primary hover:underline ml-1"
                    >
                      Operator Log in
                    </Link>
                  </p>
                  <p className="text-xs text-text-muted">
                    Looking to join as a student?{" "}
                    <Link
                      to="/register"
                      className="font-bold text-primary hover:underline ml-1"
                    >
                      Student Registration
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
            <span>Club Gateway Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
