import { useRef, useState } from "react";
import { extractErrorMessage } from "../services/api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * ImageUploadField — Week 7 Stage 2
 *
 * Upload / replace / remove control for a club logo or an event banner.
 * Validates type and size in the browser for fast feedback; the backend
 * re-checks file contents and dimensions and its message is shown on failure.
 * The parent performs the API calls and updates its state from the response.
 *
 * @param {string} label - Field label (e.g. "Club logo")
 * @param {string|null} currentUrl - Current image URL from the backend, or null
 * @param {number} maxBytes - Maximum file size in bytes (logo 2 MB, banner 5 MB)
 * @param {"square"|"wide"} [shape] - Preview shape: square logo or 16:9 banner
 * @param {(file: File) => Promise<void>} onUpload - Uploads the file
 * @param {() => Promise<void>} onRemove - Removes the current image
 * @param {boolean} [disabled] - Disables all actions
 * @param {string} [disabledReason] - Shown instead of the controls when disabled
 */
export default function ImageUploadField({
  label,
  currentUrl,
  maxBytes,
  shape = "square",
  onUpload,
  onRemove,
  disabled = false,
  disabledReason = "",
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  const previewClass =
    shape === "wide" ? "w-full max-w-sm aspect-video rounded-xl" : "w-20 h-20 rounded-2xl";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`The image must be ${maxMb} MB or smaller.`);
      return;
    }

    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to upload the image."));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setError("");
    setBusy(true);
    try {
      await onRemove();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to remove the image."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-on-surface">{label}</span>

      <div className={`flex ${shape === "wide" ? "flex-col" : "items-center"} gap-4`}>
        <div
          className={`${previewClass} bg-surface-lavender border border-border-subtle overflow-hidden flex items-center justify-center shrink-0`}
        >
          {currentUrl ? (
            <img src={currentUrl} alt={`${label} preview`} className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[28px] text-primary/60" aria-hidden="true">
              {shape === "wide" ? "panorama" : "add_photo_alternate"}
            </span>
          )}
        </div>

        {disabled ? (
          disabledReason && <p className="text-[11px] text-text-muted">{disabledReason}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">upload</span>
                {busy ? "Saving…" : currentUrl ? "Replace" : "Upload"}
              </button>
              {currentUrl && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border-subtle text-xs font-semibold text-on-surface hover:text-rose-600 transition-colors disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-muted">JPEG, PNG or WebP, up to {maxMb} MB.</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={handleFile}
        aria-label={`${label} file`}
      />

      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
