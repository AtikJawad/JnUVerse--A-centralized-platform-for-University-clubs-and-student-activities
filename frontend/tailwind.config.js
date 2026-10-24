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
        "primary": "#0810A4",
        "primary-hover": "#1F2792",
        "secondary": "#58579D",
        "tertiary": "#B2C7F7",
        "on-surface": "#181A2C",
        "text-muted": "#686B7D",
        "border-subtle": "#E2E4F3",

        // Stitch Container & Elevation Colors
        "primary-container": "#2B34B9",
        "primary-dark": "#0810A4",
        "secondary-container": "#B3B1FF",
        "on-secondary-container": "#434186",
        "on-primary-container": "#ABB1FF",
        "secondary-fixed": "#E2DFFF",
        "on-secondary-fixed": "#130E56",
        "tertiary-fixed": "#D8E2FF",
        "tertiary-fixed-dim": "#B1C6F6",
        "surface-container": "#EDECFF",
        "surface-container-low": "#F4F2FF",
        "surface-container-high": "#E6E6FF",
        "surface-variant": "#E0E0F9",
        "on-surface-variant": "#454654",

        // Functional / Feedback States
        "error": "#BA1A1A",
        "error-container": "#FFDAD6",
        "on-error": "#FFFFFF",
        "on-error-container": "#93000A",
        "on-primary": "#FFFFFF",
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
