import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../services/api";

const SLIDES = [
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

  // Auto-advance left carousel slides gently
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!identifier.trim()) {
      setErrorMessage("Please enter your Username, Email or Student ID.");
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
    <div className="min-h-screen bg-[#F3FAF5] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans text-slate-800">
      {/* Outer Card Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-100/60 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[620px]">
        {/* Left Side: Soft Pastel Green Feature Showcase */}
        <div className="bg-[#EAF6EE] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative background circle */}
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

          {/* Top Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200/70">
              Jagannath University
            </span>
            <span className="text-xs font-medium text-emerald-700/80">
              {SLIDES[activeSlide].tag}
            </span>
          </div>

          {/* Center Graphic Illustration */}
          <div className="relative z-10 my-auto py-8 flex flex-col items-center text-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {/* Soft green circle backdrop */}
              <div className="absolute inset-4 bg-emerald-200/40 rounded-full animate-pulse" />

              {/* Handcrafted campus / student vector graphic */}
              <svg
                viewBox="0 0 240 240"
                className="w-full h-full relative z-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Desk */}
                <rect x="75" y="145" width="90" height="6" rx="3" fill="#1E293B" />
                <rect x="85" y="151" width="6" height="50" rx="2" fill="#334155" />
                <rect x="149" y="151" width="6" height="50" rx="2" fill="#334155" />

                {/* Chair */}
                <rect x="110" y="155" width="22" height="4" rx="2" fill="#10B981" />
                <rect x="112" y="130" width="18" height="25" rx="3" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" />
                <rect x="118" y="159" width="6" height="42" fill="#047857" />

                {/* Student Figure */}
                {/* Torso & Shirt */}
                <path
                  d="M105 130 C105 118, 135 118, 135 130 L138 160 C138 165, 102 165, 102 160 Z"
                  fill="#A7F3D0"
                  stroke="#047857"
                  strokeWidth="2"
                />
                {/* Arms writing on desk */}
                <path
                  d="M106 130 Q92 142 98 148 Q110 148 116 145"
                  stroke="#047857"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M134 130 Q145 142 138 147 Q126 148 122 145"
                  stroke="#047857"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Head & Hair */}
                <circle cx="120" cy="105" r="13" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
                <path
                  d="M107 104 C107 92, 133 92, 133 104 C128 98, 112 98, 107 104 Z"
                  fill="#1E293B"
                />

                {/* Exam / Activity Sheets */}
                <rect x="70" y="112" width="28" height="34" rx="2" fill="white" stroke="#64748B" strokeWidth="1.5" transform="rotate(-6 70 112)" />
                <line x1="74" y1="120" x2="92" y2="118" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="74" y1="125" x2="90" y2="123" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="74" y1="130" x2="88" y2="128" stroke="#94A3B8" strokeWidth="1.5" />

                <rect x="80" y="116" width="30" height="36" rx="2" fill="white" stroke="#334155" strokeWidth="1.5" />
                <line x1="86" y1="124" x2="104" y2="124" stroke="#10B981" strokeWidth="2" />
                <line x1="86" y1="130" x2="102" y2="130" stroke="#64748B" strokeWidth="1.5" />
                <line x1="86" y1="136" x2="98" y2="136" stroke="#64748B" strokeWidth="1.5" />
                <line x1="86" y1="142" x2="103" y2="142" stroke="#64748B" strokeWidth="1.5" />

                {/* Backpack on floor */}
                <path
                  d="M152 165 C152 155, 172 155, 172 165 L173 195 C173 198, 151 198, 151 195 Z"
                  fill="#059669"
                  stroke="#064E3B"
                  strokeWidth="2"
                />
                <path d="M158 155 Q162 147 166 155" stroke="#064E3B" strokeWidth="2" fill="none" />
                <rect x="156" y="172" width="12" height="10" rx="2" fill="#34D399" />

                {/* Potted Plant */}
                <path d="M48 185 L52 201 H64 L68 185 Z" fill="#334155" />
                <path d="M58 185 Q58 172 50 170 Q56 177 58 185" fill="#10B981" />
                <path d="M58 180 Q66 174 64 165 Q60 174 58 180" fill="#059669" />
                <path d="M58 183 Q52 162 58 155 Q62 165 58 183" fill="#34D399" />

                {/* Floating academic & club icons */}
                <circle cx="56" cy="68" r="14" fill="white" stroke="#6EE7B7" strokeWidth="1.5" />
                <path d="M56 60 L56 68 L62 68" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />

                {/* Light bulb / gear icon */}
                <rect x="154" y="60" width="26" height="26" rx="6" fill="white" stroke="#6EE7B7" strokeWidth="1.5" />
                <path d="M167 66 L167 80 M160 73 L174 73" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

                {/* Math & Club formulas */}
                <text x="35" y="105" fill="#047857" fontSize="10" fontFamily="monospace">x - y</text>
                <text x="148" y="112" fill="#047857" fontSize="10" fontFamily="monospace">x²</text>
                <text x="160" y="52" fill="#047857" fontSize="12" fontFamily="serif">√x</text>
                <text x="190" y="80" fill="#047857" fontSize="12" fontFamily="serif">π</text>
                <text x="175" y="100" fill="#047857" fontSize="9" fontFamily="monospace">(x, y)</text>
              </svg>
            </div>

            {/* Slide Text Content */}
            <h2 className="mt-4 text-xl sm:text-2xl font-bold text-[#1E293B]">
              {SLIDES[activeSlide].title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#475569] max-w-sm leading-relaxed">
              {SLIDES[activeSlide].description}
            </p>
          </div>

          {/* Carousel Dots */}
          <div className="relative z-10 flex items-center justify-center space-x-2 pt-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === index
                    ? "w-7 bg-emerald-600"
                    : "w-2 bg-emerald-200 hover:bg-emerald-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Clean White Login Form */}
        <div className="p-8 sm:p-12 md:p-14 flex flex-col justify-between bg-white">
          <div className="max-w-sm w-full mx-auto my-auto">
            {/* Brand Logo Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center space-x-2 mb-2">
                {/* Graduation Cap Icon */}
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
                Jagannath University Student &amp; Club Portal
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs sm:text-sm flex items-start space-x-2.5 animate-fadeIn"
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
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Username or email
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  disabled={isSubmitting}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. B220305043 or student@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition text-sm disabled:bg-slate-50"
                    required
                  />
                </div>
                <div className="text-right mt-1.5">
                  <span className="text-xs text-emerald-700/80 hover:text-emerald-800 cursor-pointer font-medium">
                    Forgot password?
                  </span>
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center justify-center space-x-3 text-xs text-slate-400">
              <div className="h-[1px] bg-slate-200 flex-1" />
              <span>or</span>
              <div className="h-[1px] bg-slate-200 flex-1" />
            </div>

            {/* University Portal Tip / Alternate Action */}
            <div className="flex items-center justify-center space-x-2 py-2 px-3 border border-slate-200/80 rounded-lg bg-slate-50/50 text-xs text-slate-600">
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Verified Jagannath University Identity</span>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-slate-500">
              Are you new?{" "}
              <Link
                to="/register"
                className="font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-2 ml-1"
              >
                Create an Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
