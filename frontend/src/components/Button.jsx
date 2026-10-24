/**
 * Button Component — JnUVerse Stitch Design System
 * Full pill geometry, responsive states, and accessible keyboard focus.
 */
export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  icon = null,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5 h-8",
    md: "px-5 py-2.5 text-sm gap-2 h-11",
    lg: "px-7 py-3 text-base gap-2.5 h-12",
  };

  const variantStyles = {
    primary:
      "bg-primary text-white hover:bg-primary-hover active:translate-y-0 hover:-translate-y-0.5 shadow-resting hover:shadow-primary-glow focus-visible:ring-primary",
    secondary:
      "bg-surface-lavender text-primary hover:bg-[#d8d6fc] active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-secondary",
    outline:
      "bg-transparent border border-border-subtle text-on-surface hover:bg-surface-lavender hover:border-primary/30 active:translate-y-0 focus-visible:ring-primary",
    danger:
      "bg-error text-white hover:bg-[#a01616] active:translate-y-0 shadow-sm focus-visible:ring-error",
    ghost:
      "bg-transparent text-text-muted hover:text-on-surface hover:bg-surface-lavender focus-visible:ring-primary",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
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
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
