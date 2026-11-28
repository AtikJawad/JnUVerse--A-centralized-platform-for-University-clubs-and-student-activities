/**
 * InterestTags — Week 7 Stage 2
 *
 * Read-only chips for a club's interests (`club.interests: [{ id, name }]`).
 * Renders nothing when the list is empty or missing.
 *
 * @param {Array<{id: string, name: string}>} interests - Interest objects
 * @param {number} [max] - Maximum chips to show; the rest collapse into "+N"
 * @param {string} [className] - Extra wrapper classes
 */
export default function InterestTags({ interests, max, className = "" }) {
  if (!Array.isArray(interests) || interests.length === 0) return null;

  const visible = typeof max === "number" ? interests.slice(0, max) : interests;
  const hidden = interests.length - visible.length;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Club interests">
      {visible.map((interest) => (
        <li
          key={interest.id}
          className="px-2.5 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-semibold"
        >
          {interest.name}
        </li>
      ))}
      {hidden > 0 && (
        <li className="px-2.5 py-0.5 rounded-full bg-canvas-base text-text-muted text-[11px] font-semibold border border-border-subtle">
          +{hidden}
        </li>
      )}
    </ul>
  );
}
