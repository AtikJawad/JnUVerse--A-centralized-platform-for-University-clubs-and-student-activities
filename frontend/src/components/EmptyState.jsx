/**
 * EmptyState Component — JnUVerse Stitch Design System
 * Clean surface for lists, searches, or modules without content.
 */
export default function EmptyState({
  title = "No items found",
  description = "There are no records to display at this time.",
  icon = "inbox",
  action = null,
  className = "",
}) {
  return (
    <div
      className={`bg-surface-white border border-border-subtle rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-resting ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
