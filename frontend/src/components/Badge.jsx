/**
 * Badge Component — JnUVerse Stitch Design System
 * Category, role, status, and department pill tag.
 */
export default function Badge({
  children,
  variant = "primary",
  size = "md",
  dot = false,
  className = "",
}) {
  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[11px]",
    md: "px-3 py-1 text-xs",
  };

  const variantStyles = {
    primary: "bg-surface-lavender text-primary border border-primary/20",
    secondary: "bg-[#e2dfff] text-[#130e56] border border-secondary/30",
    lavender: "bg-surface-lavender text-on-surface-variant border border-border-subtle",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    error: "bg-error-container/60 text-on-error-container border border-error/20",
    neutral: "bg-surface-white text-text-muted border border-border-subtle shadow-xs",
  };

  const dotColors = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    lavender: "bg-on-surface-variant",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-error",
    neutral: "bg-text-muted",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold select-none ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.primary} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dotColors[variant] || "bg-primary"
          }`}
        />
      )}
      {children}
    </span>
  );
}
