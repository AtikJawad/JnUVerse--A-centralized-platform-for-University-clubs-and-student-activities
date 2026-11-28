import { useState } from "react";
import { Link } from "react-router-dom";
import InterestPicker from "./InterestPicker";
import { interestsAPI, extractErrorMessage } from "../services/api";

const DISMISS_KEY_PREFIX = "jnuverse:interests-prompt-dismissed:";

/** True when this student chose "Skip for now" on this browser. */
export function isInterestsPromptDismissed(userId) {
  if (!userId) return false;
  return localStorage.getItem(DISMISS_KEY_PREFIX + userId) === "1";
}

/**
 * InterestsPrompt — Week 7 Stage 3
 *
 * Skippable onboarding card shown on the student dashboard when the backend
 * reports `has_interests: false`. Saves with PUT /api/auth/me/interests/.
 *
 * @param {string} userId - Logged-in student's id (used to remember "Skip for now")
 * @param {(interests: Array<{id: string, name: string}>) => void} onSaved - Called after saving
 * @param {() => void} onSkip - Called when the student skips
 */
export default function InterestsPrompt({ userId, onSaved, onSkip }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await interestsAPI.setMine(selected);
      onSaved(res.data?.interests || []);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save your interests."));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (userId) localStorage.setItem(DISMISS_KEY_PREFIX + userId, "1");
    onSkip();
  };

  return (
    <section
      aria-labelledby="interests-prompt-heading"
      className="w-full rounded-3xl bg-surface-white border border-primary/20 shadow-[0_4px_30px_rgba(43,52,185,0.06)] p-6 sm:p-8 flex flex-col gap-5"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">interests</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 id="interests-prompt-heading" className="text-lg font-bold text-on-surface">
            Choose your interests
          </h2>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            Pick a few topics you care about and we will suggest clubs that match. You can change them any
            time from your{" "}
            <Link to="/profile" className="text-primary font-semibold hover:underline">
              profile
            </Link>
            .
          </p>
        </div>
      </div>

      <InterestPicker value={selected} onChange={setSelected} disabled={saving} label="Choose your interests" />

      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border-subtle">
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="px-5 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface hover:bg-surface-lavender transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || selected.length === 0}
          className="px-6 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
          {saving ? "Saving..." : selected.length > 0 ? `Save (${selected.length})` : "Save"}
        </button>
      </div>
    </section>
  );
}
