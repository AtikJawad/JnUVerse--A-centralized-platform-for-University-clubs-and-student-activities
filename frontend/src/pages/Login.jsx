import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../services/api";
import Button from "../components/Button";
import Input from "../components/Input";
import ErrorAlert from "../components/ErrorAlert";

const HIGHLIGHTS = [
  {
    title: "JnU Club Ecosystem",
    description:
      "Connect with verified university clubs, research societies, debate forums, and student cultural organizations in one centralized platform.",
    tag: "30+ Active Clubs",
  },
  {
    title: "Verified Student Network",
    description:
      "Log in with your official Jagannath University credentials. Real-time validation against verified university academic records.",
    tag: "Official University ID",
  },
  {
    title: "Campus Events & Fests",
    description:
      "Stay updated with upcoming seminars, tech fests, workshops, and extracurricular activities happening across JnU campus.",
    tag: "Campus Happenings",
  },
];

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  // Auto-advance visual presentation highlights
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HIGHLIGHTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!identifier.trim()) {
      setErrorMessage("Please enter your Email or Student ID.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (error) {
      const msg = extractErrorMessage(
        error,
        "Login failed. Please verify your credentials."
      );
      setErrorMessage(msg);
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
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-resting group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-on-surface">
              JnU<span className="text-primary">Verse</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-8 lg:py-12 px-4 sm:px-6 lg:px-12">
        <div className="max-w-[1240px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Form Container */}
          <div className="lg:col-span-5 flex flex-col justify-center max-w-[420px] mx-auto w-full">
            {/* Header */}
            <div className="text-center lg:text-left mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-[#4F5BFF] text-white shadow-primary-glow mb-4">
                <span className="material-symbols-outlined text-[26px]">login</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                Login to your account!
              </h1>
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                Enter your registered Student ID or email address and password to login.
              </p>
            </div>

            {/* Error Banner */}
            <ErrorAlert
              message={errorMessage}
              onDismiss={() => setErrorMessage("")}
              className="mb-5"
            />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email or Student ID"
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                disabled={isSubmitting}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. B220305043 or student@gmail.com"
                required
                icon={<span className="material-symbols-outlined text-[20px]">mail</span>}
                helperText="Use your Student ID (e.g. B220305043) or verified Email"
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                icon={<span className="material-symbols-outlined text-[20px]">lock</span>}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-lavender transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                }
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full h-11"
                >
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Button>
              </div>
            </form>

            {/* Footer / Account Creation Navigation */}
            <div className="pt-6 mt-6 border-t border-border-subtle space-y-2 text-center lg:text-left">
              <p className="text-sm text-text-muted">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-bold text-primary hover:underline underline-offset-4 ml-1"
                >
                  Register as Student
                </Link>
              </p>
              <p className="text-xs sm:text-sm text-text-muted">
                Want to manage your club?{" "}
                <Link
                  to="/register/club"
                  className="font-bold text-primary hover:underline underline-offset-4 ml-1"
                >
                  Register as a Club Operator
                </Link>
              </p>
            </div>
          </div>

          {/* Right Column: Stitch Orbital Visual Presentation Card */}
          <div className="lg:col-span-7 w-full flex justify-center">
            <div className="w-full max-w-[600px] rounded-3xl lg:rounded-[2.5rem] bg-gradient-to-b from-[#e8f1ff] via-[#edf3ff] to-[#e4edff] border border-white/80 p-8 sm:p-10 shadow-elevated flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[560px]">
              {/* Inner ambient glows */}
              <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/70 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

              {/* Title Header */}
              <div className="relative z-10 space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
                  Write &amp; Connect <span className="text-primary">Everywhere</span>
                </h2>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 border border-primary/15 text-xs font-semibold text-primary shadow-xs">
                    <span className="material-symbols-outlined text-[14px]">school</span>
                    JnU Students
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 border border-primary/15 text-xs font-semibold text-primary shadow-xs">
                    <span className="material-symbols-outlined text-[14px]">diversity_3</span>
                    Verified Campus Clubs
                  </span>
                </div>
              </div>

              {/* Central Orbital Graphic */}
              <div className="relative z-10 w-full flex items-center justify-center py-6 my-auto">
                <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
                  {/* Outer Orbital Ring */}
                  <div className="absolute inset-0 rounded-full border border-primary/15 pointer-events-none" />
                  {/* Middle Orbital Ring */}
                  <div className="absolute inset-[44px] sm:inset-[54px] rounded-full border border-primary/20 pointer-events-none" />
                  {/* Inner Orbital Ring */}
                  <div className="absolute inset-[88px] sm:inset-[108px] rounded-full border border-primary/25 pointer-events-none" />

                  {/* Central Planet Hub (Stable Anchor) */}
                  <div
                    className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#1423C6] via-primary to-[#4F5BFF] flex flex-col items-center justify-center text-white shadow-primary-glow border-4 border-white/60 transition-transform duration-300 hover:scale-105 cursor-pointer"
                    title="Jagannath University Core"
                  >
                    <span className="material-symbols-outlined text-[32px] sm:text-[38px]">
                      hub
                    </span>
                    <span className="text-[10px] tracking-wider font-bold uppercase -mt-1">
                      JnU
                    </span>
                  </div>

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

              {/* Dynamic Highlight Caption & Dots */}
              <div className="relative z-10 w-full max-w-sm mx-auto space-y-3">
                <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
                  {HIGHLIGHTS[activeSlide].description}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {HIGHLIGHTS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeSlide === i ? "w-6 bg-primary" : "w-2 bg-primary/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-white/60 border-t border-border-subtle py-4">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>&copy; 2026 Jagannath University (JnU). All rights reserved.</span>
          <div className="flex items-center gap-6">
            <span>Centralized Student &amp; Club Portal</span>
            <span>Week 2 Auth Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
