import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingState from "../components/LoadingState";
import InterestPicker from "../components/InterestPicker";
import { interestsAPI, extractErrorMessage } from "../services/api";

/**
 * Profile — Week 7 Stage 3 (student only)
 *
 * Read-only account details from GET /api/auth/me/ and editable interests
 * (GET / PUT /api/auth/me/interests/). Interests drive club suggestions on the dashboard.
 */
export default function Profile() {
  const { user } = useAuth();

  const [savedIds, setSavedIds] = useState([]);
  const [draftIds, setDraftIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const loadInterests = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await interestsAPI.getMine();
      const ids = (res.data?.interests || []).map((i) => i.id);
      setSavedIds(ids);
      setDraftIds(ids);
    } catch (err) {
      setLoadError(extractErrorMessage(err, "Failed to load your interests."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  const isDirty = useMemo(() => {
    if (savedIds.length !== draftIds.length) return true;
    const saved = new Set(savedIds);
    return draftIds.some((id) => !saved.has(id));
  }, [savedIds, draftIds]);

  const handleChange = (ids) => {
    setDraftIds(ids);
    setSaveSuccess("");
    setSaveError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await interestsAPI.setMine(draftIds);
      const ids = (res.data?.interests || []).map((i) => i.id);
      setSavedIds(ids);
      setDraftIds(ids);
      setSaveSuccess(
        ids.length > 0
          ? "Your interests have been saved. Club suggestions on your dashboard will use them."
          : "Your interests have been cleared."
      );
    } catch (err) {
      setSaveError(extractErrorMessage(err, "Failed to save your interests."));
    } finally {
      setSaving(false);
    }
  };

  const details = [
    { label: "Full Name", value: user?.name, icon: "badge" },
    { label: "Student ID", value: user?.student_id, icon: "fingerprint" },
    { label: "Email", value: user?.email, icon: "mail" },
    { label: "Department", value: user?.department, icon: "school" },
    { label: "Batch", value: user?.batch ? `Batch ${user.batch}` : null, icon: "calendar_month" },
  ];

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface antialiased flex flex-col justify-between selection:bg-surface-variant selection:text-primary">
      <Navbar />

      <main className="w-full pt-20 bg-canvas-base flex-1">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-12 py-8 flex flex-col gap-8">
          {/* PAGE HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
            <div className="flex flex-col max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-lavender w-fit mb-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-bold tracking-wider uppercase">
                  Student Profile
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] text-on-surface tracking-tight font-extrabold leading-tight">
                Your profile,{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  your interests.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-text-muted mt-2 leading-relaxed">
                Choose what you care about and we will suggest clubs that match.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-lavender hover:bg-surface-variant text-primary text-xs font-bold shadow-xs transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Account details (read-only) */}
            <section
              aria-labelledby="account-heading"
              className="lg:col-span-5 bg-surface-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle flex flex-col gap-5"
            >
              <div className="pb-4 border-b border-border-subtle">
                <h2 id="account-heading" className="text-base font-bold text-on-surface">
                  Account Details
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Verified against JnU student records. These details cannot be changed here.
                </p>
              </div>

              <dl className="flex flex-col gap-3">
                {details.map((item) => (
                  <div
                    key={item.label}
                    className="p-3.5 rounded-xl bg-canvas-base border border-border-subtle/80 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-lavender flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <dt className="text-[11px] text-text-muted">{item.label}</dt>
                      <dd className="text-xs font-semibold text-on-surface truncate">
                        {item.value || "—"}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            {/* RIGHT: Interests (editable) */}
            <section
              aria-labelledby="interests-heading"
              className="lg:col-span-7 bg-surface-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(43,52,185,0.04)] border border-border-subtle flex flex-col gap-5"
            >
              <div className="pb-4 border-b border-border-subtle flex items-start justify-between gap-4">
                <div>
                  <h2 id="interests-heading" className="text-base font-bold text-on-surface">
                    Your Interests
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Clubs that share at least one of your interests appear in your dashboard suggestions.
                  </p>
                </div>
                {!loading && !loadError && (
                  <span className="shrink-0 px-2.5 py-1 rounded-full bg-surface-lavender text-primary text-[11px] font-bold">
                    {draftIds.length} selected
                  </span>
                )}
              </div>

              {loading && <LoadingState message="Loading your interests..." />}

              {!loading && loadError && (
                <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs flex items-center justify-between gap-3">
                  <span>{loadError}</span>
                  <button
                    type="button"
                    onClick={loadInterests}
                    className="px-3 py-1.5 rounded-full bg-surface-white text-on-surface text-xs font-semibold shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !loadError && (
                <>
                  <InterestPicker
                    value={draftIds}
                    onChange={handleChange}
                    disabled={saving}
                    label="Your interests"
                  />

                  {saveError && (
                    <p className="text-xs text-error" role="alert">
                      {saveError}
                    </p>
                  )}
                  {saveSuccess && (
                    <p className="text-xs text-emerald-700 font-semibold" role="status">
                      {saveSuccess}
                    </p>
                  )}

                  <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange([])}
                      disabled={saving || draftIds.length === 0}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-rose-600 transition-colors disabled:opacity-40"
                    >
                      Clear all
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleChange(savedIds)}
                        disabled={saving || !isDirty}
                        className="px-5 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface hover:bg-surface-lavender transition-colors disabled:opacity-40"
                      >
                        Discard changes
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="px-6 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        {saving ? "Saving..." : "Save Interests"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
