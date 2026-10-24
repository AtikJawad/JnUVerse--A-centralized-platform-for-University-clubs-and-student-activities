/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Stitch Core Design Tokens
        "canvas-base": "#F8F8FF",
        "surface-white": "#FFFFFF",
        "surface-lavender": "#EBECF9",
        "primary": "#2B34B9",
        "primary-hover": "#1F2792",
        "secondary": "#AEACF9",
        "tertiary": "#B2C7F7",
        "on-surface": "#131526",
        "text-muted": "#686B7D",
        "border-subtle": "#E2E4F3",

        // Stitch Container & Elevation Colors
        "surface-container": "#edecff",
        "surface-container-low": "#f4f2ff",
        "surface-container-high": "#e6e6ff",
        "surface-variant": "#e0e0f9",
        "on-surface-variant": "#454654",

        // Functional / Feedback States
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "on-primary": "#ffffff",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        resting:
          "0 4px 20px -2px rgba(43, 52, 185, 0.04), 0 2px 6px -1px rgba(19, 21, 38, 0.03)",
        elevated:
          "0 16px 36px -4px rgba(43, 52, 185, 0.08), 0 6px 12px -2px rgba(19, 21, 38, 0.02)",
        "primary-glow": "0 8px 24px -4px rgba(43, 52, 185, 0.35)",
      },
    },
  },
  plugins: [],
};
