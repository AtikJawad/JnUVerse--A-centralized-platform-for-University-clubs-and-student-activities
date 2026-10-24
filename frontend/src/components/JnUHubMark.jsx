/**
 * JnUHubMark: Reusable JnU brand mark and central hub symbol.
 * Matches the visual design tokens established in the Login page.
 */
export default function JnUHubMark({ variant = "orbital", className = "" }) {
  if (variant === "header") {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-resting transition-transform ${className}`}
      >
        <span className="material-symbols-outlined text-[20px]">hub</span>
      </div>
    );
  }

  // variant === "orbital" (Central Radiant Planetary Hub)
  return (
    <div
      className={`relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#1423C6] via-primary to-[#4F5BFF] flex flex-col items-center justify-center text-white shadow-primary-glow border-4 border-white/60 transition-transform duration-300 hover:scale-105 cursor-pointer ${className}`}
      title="JnUVerse Core Hub"
    >
      <span className="material-symbols-outlined text-[32px] sm:text-[38px]">hub</span>
      <span className="text-[10px] tracking-wider font-bold uppercase -mt-1">JnU</span>
    </div>
  );
}
