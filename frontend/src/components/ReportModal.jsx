import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { reportsAPI, REPORT_REASONS, extractErrorMessage } from "../services/api";

const DETAILS_MAX = 1000;

/**
 * ReportModal — Week 7 Stage 6
 *
 * Report an inappropriate club or event (POST /api/reports/). Stitch has no report
 * dialog, so this reuses the project's existing confirmation-modal pattern
 * (OperatorEvents / ProposeCollaborationModal) and DESIGN.md modal rules.
 *
 * @param {"club"|"event"} targetType
 * @param {string} target - Club slug or event id
 * @param {string} targetName - Shown in the heading
 * @param {() => void} onClose
 * @param {() => void} [onReported] - Called after a successful (201) or duplicate (409) report
 */
export default function ReportModal({ targetType, target, targetName, onClose, onReported }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null); // "submitted" | "duplicate"
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const detailsRequired = reason === "other";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!reason) errors.reason = "Choose a reason.";
    if (detailsRequired && !details.trim()) errors.details = "Please describe the problem when the reason is 'Other'.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = { target_type: targetType, target, reason };
      if (details.trim()) payload.details = details.trim();
      await reportsAPI.create(payload);
      setResult("submitted");
      onReported?.();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409) {
        setResult("duplicate");
        onReported?.();
      } else if (status === 400 && data && typeof data === "object") {
        const next = {};
        ["reason", "details"].forEach((key) => {
          if (data[key]) next[key] = [].concat(data[key]).join(" ");
        });
        setFieldErrors(next);
        const other = data.target || data.target_type || data.non_field_errors || data.detail;
        if (other) setFormError([].concat(other).join(" "));
        else if (Object.keys(next).length === 0) setFormError(extractErrorMessage(err, "Could not send the report."));
      } else {
        setFormError(extractErrorMessage(err, "Could not send the report."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const kind = targetType === "club" ? "club" : "event";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xl border border-border-subtle space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-error-container/60 text-error flex items-center justify-center shadow-xs">
          <span className="material-symbols-outlined text-[26px]">flag</span>
        </div>

        {result ? (
          <>
            <div className="space-y-2">
              <h3 id="report-modal-title" className="text-xl font-bold text-on-surface">
                {result === "submitted" ? "Report received" : "You have already reported this"}
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {result === "submitted"
                  ? `Thank you. The JnUVerse team will review your report about this ${kind}. The ${kind} is not notified.`
                  : `Each ${kind} can be reported once per account. You can follow its status in My Reports.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Link
                to="/my-reports"
                className="px-5 py-2 rounded-full text-xs font-semibold text-primary hover:bg-surface-lavender transition-colors"
              >
                View My Reports
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <h3 id="report-modal-title" className="text-xl font-bold text-on-surface">
                Report this {kind}
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Tell us what is wrong with <strong className="text-on-surface">{targetName}</strong>. Reports are reviewed by
                the JnUVerse team and cannot be edited or withdrawn after sending.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold" role="alert">
                {formError}
              </div>
            )}

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-on-surface mb-1">Reason</legend>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_REASONS.map((option, index) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      reason === option.value
                        ? "border-primary bg-surface-lavender text-primary"
                        : "border-border-subtle text-on-surface hover:bg-canvas-base"
                    }`}
                  >
                    <input
                      ref={index === 0 ? firstFieldRef : undefined}
                      type="radio"
                      name="report-reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => {
                        setReason(option.value);
                        setFieldErrors((prev) => ({ ...prev, reason: undefined, details: undefined }));
                      }}
                      disabled={submitting}
                      className="w-4 h-4 accent-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {fieldErrors.reason && (
                <p className="text-xs text-error" role="alert">
                  {fieldErrors.reason}
                </p>
              )}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="report-details" className="text-xs font-bold text-on-surface">
                  Details{" "}
                  <span className="font-normal text-text-muted">{detailsRequired ? "(required)" : "(optional)"}</span>
                </label>
                <span className="text-[11px] text-text-muted font-mono">
                  {details.length} / {DETAILS_MAX}
                </span>
              </div>
              <textarea
                id="report-details"
                rows={4}
                maxLength={DETAILS_MAX}
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, details: undefined }));
                }}
                disabled={submitting}
                placeholder="What happened? Include anything that helps the team review it."
                className="w-full p-3 rounded-xl bg-surface-white text-on-surface text-xs border border-border-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-y"
              />
              {fieldErrors.details && (
                <p className="text-xs text-error" role="alert">
                  {fieldErrors.details}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2 rounded-full text-xs font-semibold text-text-muted hover:text-on-surface hover:bg-surface-lavender transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-full bg-error hover:bg-error/90 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">flag</span>
                {submitting ? "Sending..." : "Send Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
