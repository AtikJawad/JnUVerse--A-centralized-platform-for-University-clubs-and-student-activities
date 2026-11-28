import { useRef, useState } from "react";
import { extractErrorMessage } from "../services/api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * ImageUploadField — Week 7 Stage 2
 *
 * Built on Stitch `jnuverse_club_profile_management/code.html` "Section A: Logo Upload Area":
 * title with "Editable" pill and "Public Asset" pill, framed preview, dashed drag & drop zone,
 * and "Change" / "Remove" buttons. Reused for event banners with a 16:9 preview.
 *
 * Validates type and size in the browser; the backend re-checks contents and dimensions
 * and its message is shown on failure. The parent performs the API calls.
 *
 * @param {string} label - Section title (e.g. "Club Insignia & Logo")
 * @param {string} [description] - Helper line under the title
 * @param {string} [itemName] - Word used on buttons ("Logo" / "Banner")
 * @param {string|null} currentUrl - Current image URL from the backend, or null
 * @param {number} maxBytes - Maximum file size in bytes (logo 2 MB, banner 5 MB)
 * @param {"square"|"wide"} [shape] - Square logo frame or 16:9 banner frame
 * @param {(file: File) => Promise<void>} onUpload - Uploads the file
 * @param {() => Promise<void>} onRemove - Removes the current image
 * @param {boolean} [disabled] - Disables all actions
 * @param {string} [disabledReason] - Shown instead of the upload zone when disabled
 */
export default function ImageUploadField({
  label,
  description = "",
  itemName = "Image",
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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  const frameClass =
    shape === "wide" ? "w-full sm:w-56 aspect-video rounded-2xl" : "w-24 h-24 rounded-2xl";

  const processFile = async (file) => {
    if (!file || disabled || busy) return;
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

  const openPicker = () => {
    if (!disabled && !busy) inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title + Editable pill, description, Public Asset pill */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-on-surface">{label}</h3>
            {disabled ? (
              <span className="px-2 py-0.5 rounded-full bg-canvas-base text-text-muted border border-border-subtle text-[11px] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Locked
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Editable
              </span>
            )}
          </div>
          {description && <p className="text-[13px] leading-5 text-text-muted mt-0.5">{description}</p>}
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-surface-lavender text-primary-container text-[11px] font-medium">
          Public Asset
        </span>
      </div>

      <div
        className={`flex flex-col ${shape === "wide" ? "" : "sm:flex-row"} items-center gap-6 p-4 rounded-xl bg-canvas-base/80 border border-border-subtle/80`}
      >
        {/* Preview frame */}
        <div className="relative shrink-0 group w-full sm:w-auto flex justify-center">
          <div
            className={`${frameClass} bg-surface-white border-2 border-border-subtle flex items-center justify-center shadow-sm relative overflow-hidden transition-all duration-200 group-hover:scale-105`}
          >
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={`${label} preview`}
                className="w-full h-full object-cover rounded-2xl p-1 bg-surface-white"
              />
            ) : (
              <span className="material-symbols-outlined text-[32px] text-primary-container/50" aria-hidden="true">
                {shape === "wide" ? "panorama" : "add_photo_alternate"}
              </span>
            )}
            {currentUrl && (
              <span
                className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-surface-white"
                title="Saved"
              />
            )}
          </div>
        </div>

        {/* Upload drag & trigger area */}
        <div className="flex-1 w-full flex flex-col items-start gap-2">
          {disabled ? (
            <p className="text-[13px] text-text-muted p-4">{disabledReason}</p>
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Upload ${itemName.toLowerCase()}`}
                onClick={openPicker}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPicker();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  processFile(e.dataTransfer.files?.[0]);
                }}
                className={`w-full flex items-center justify-center p-4 border border-dashed rounded-xl transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  dragOver
                    ? "border-primary-container bg-surface-lavender/50"
                    : "border-border-subtle bg-surface-white/60 hover:bg-surface-lavender/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-lavender flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">
                      {busy ? "progress_activity" : "cloud_upload"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">
                      {busy ? "Saving…" : `Click to upload a new ${itemName.toLowerCase()} or drag & drop`}
                    </span>
                    <span className="text-[13px] text-text-muted">
                      PNG, JPG or WebP (max {maxMb}MB{shape === "wide" ? ", 16:9 recommended" : ", square recommended"})
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={busy}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-lavender text-primary-container hover:bg-secondary-fixed text-[11px] font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  {currentUrl ? `Change ${itemName}` : `Upload ${itemName}`}
                </button>
                {currentUrl && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error text-[11px] transition-colors flex items-center gap-1 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                    Remove
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-selecting the same file
          processFile(file);
        }}
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
