/**
 * Card Component — JnUVerse Stitch Design System
 * Pure white surface, subtle 1px border (#E2E4F3), soft ambient elevation.
 */
export default function Card({
  children,
  className = "",
  padding = "p-6",
  hoverEffect = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-white border border-border-subtle rounded-2xl shadow-resting transition-all duration-200 ${
        hoverEffect
          ? "hover:-translate-y-1 hover:shadow-elevated hover:border-primary/20 cursor-pointer"
          : ""
      } ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
