import { Component } from "react";

/**
 * ErrorBoundary — Week 9 Stage 2
 *
 * Catches rendering errors in the routed pages so a bug never leaves a blank screen. Shows a
 * recoverable fallback (try again / reload / go home) in the Stitch empty-state style. `resetKey`
 * (the current path) clears the error when the user navigates elsewhere.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept in the console for debugging; no external error service is configured
    console.error("JnUVerse page error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    // A lazily loaded page file missing after a new deployment (stale tab) — a reload fixes it
    const isStaleChunk = /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(
      String(this.state.error?.message || this.state.error)
    );

    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center p-6">
        <div
          role="alert"
          className="max-w-md w-full flex flex-col items-center text-center p-10 bg-surface-white rounded-3xl shadow-[0_4px_24px_rgba(43,52,185,0.04)]"
        >
          <div className="w-20 h-20 rounded-full bg-error-container text-error flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[40px]">error</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface mb-2">
            {isStaleChunk ? "JnUVerse was updated." : "Something went wrong on this page."}
          </h1>
          <p className="text-[15px] leading-6 text-text-muted mb-6">
            {isStaleChunk
              ? "A newer version is available. Reload the page to continue."
              : "The rest of JnUVerse still works. Try again, reload the page, or go back to your dashboard."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="px-5 py-2.5 rounded-full bg-surface-lavender text-primary text-xs font-bold hover:bg-surface-variant transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full border border-border-subtle text-on-surface text-xs font-semibold hover:bg-surface-lavender transition-colors"
            >
              Reload page
            </button>
            <a
              href="/"
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:bg-primary-hover transition-colors"
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
