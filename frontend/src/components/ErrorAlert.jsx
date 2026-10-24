/**
 * ErrorAlert Component — JnUVerse Stitch Design System
 * Accessible alert banner for DRF validation and server errors.
 */
export default function ErrorAlert({
  title = "Error",
  message,
  onDismiss,
  className = "",
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-xl bg-error-container/60 border border-error/20 flex items-start gap-3 text-on-error-container text-xs sm:text-sm leading-relaxed transition-all ${className}`}
    >
      <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0 mt-0.5">
        error
      </span>
      <div className="flex-1">
        {title && <span className="font-semibold block mb-0.5">{title}</span>}
        <span className="font-medium break-words">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-on-error-container/60 hover:text-on-error-container p-0.5 rounded transition"
          aria-label="Dismiss error"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
