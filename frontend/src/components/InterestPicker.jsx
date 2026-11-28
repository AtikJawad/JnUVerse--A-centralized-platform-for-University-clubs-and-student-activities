import { useEffect, useState } from "react";
import { interestsAPI, extractErrorMessage } from "../services/api";

/**
 * InterestPicker — Week 7 Stage 2 (reused for students in Stage 3)
 *
 * Toggle chips over the fixed list of interests from GET /api/auth/interests/.
 * Controlled: the parent owns the selected interest ids and sends them to the backend.
 *
 * @param {string[]} value - Selected interest UUIDs
 * @param {(ids: string[]) => void} onChange - Called with the new selection
 * @param {boolean} [disabled] - Disables all chips (e.g. while saving)
 * @param {string} [label] - Accessible group label
 */
export default function InterestPicker({ value, onChange, disabled = false, label = "Interests" }) {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    interestsAPI
      .getAll()
      .then((res) => {
        if (active) setInterests(res.data?.interests || []);
      })
      .catch((err) => {
        if (active) setError(extractErrorMessage(err, "Failed to load interests."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = new Set(value || []);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  if (loading) {
    return <p className="text-xs text-text-muted">Loading interests…</p>;
  }

  if (error) {
    return <p className="text-xs text-error" role="alert">{error}</p>;
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {interests.map((interest) => {
        const isOn = selected.has(interest.id);
        return (
          <button
            key={interest.id}
            type="button"
            aria-pressed={isOn}
            disabled={disabled}
            onClick={() => toggle(interest.id)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 ${
              isOn
                ? "bg-primary text-white border-primary"
                : "bg-surface-white text-on-surface border-border-subtle hover:bg-surface-lavender"
            }`}
          >
            {isOn && (
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                check
              </span>
            )}
            {interest.name}
          </button>
        );
      })}
    </div>
  );
}
