/**
 * LoadingState Component — JnUVerse Stitch Design System
 * Clean, accessible spinner for async operations and route transitions.
 */
export default function LoadingState({
  message = "Loading...",
  fullScreen = false,
  className = "",
}) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <div className="w-9 h-9 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs sm:text-sm font-medium text-text-muted">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}
