import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { clubsAPI, eventsAPI, collaborationsAPI, extractErrorMessage } from "../services/api";

/**
 * Format ISO datetime string to short date in Asia/Dhaka (+06:00 BST).
 */
function formatDhakaDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Extract two-letter monogram from club name.
 */
function getClubMonogram(name) {
  if (!name) return "CB";
  const cleaned = name
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^JnU\s+/i, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * ProposeCollaborationModal
 *
 * Dedicated modal allowing authenticated Club Operators to propose
 * an inter-society collaboration with another university club.
 *
 * Props:
 * - isOpen (boolean): Controls modal visibility.
 * - onClose (function): Triggered on close or cancel.
 * - onSuccess (function): Callback with created Collaboration object.
 * - currentClub (object): { id, slug, name } of the operating club.
 */
export default function ProposeCollaborationModal({
  isOpen,
  onClose,
  onSuccess,
  currentClub,
}) {
  // Form State
  const [targetClubSlug, setTargetClubSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");

  // Target Clubs Selection State
  const [availableClubs, setAvailableClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsError, setClubsError] = useState("");
  const [clubSearchQuery, setClubSearchQuery] = useState("");

  // Own Eligible Events State
  const [eligibleEvents, setEligibleEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Safety refs
  const isMountedRef = useRef(true);
  const modalContentRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch available target clubs (excluding own club)
  const fetchClubs = useCallback(async () => {
    setClubsLoading(true);
    setClubsError("");
    try {
      const response = await clubsAPI.getAll({ page_size: 50 });
      if (!isMountedRef.current) return;

      const rawClubs = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
        ? response.data.results
        : [];

      // Filter out operator's own club
      const ownSlug = currentClub?.slug?.toLowerCase();
      const ownId = currentClub?.id;
      const filtered = rawClubs.filter((c) => {
        if (!c.slug) return false;
        if (ownSlug && c.slug.toLowerCase() === ownSlug) return false;
        if (ownId && c.id === ownId) return false;
        return true;
      });

      setAvailableClubs(filtered);
    } catch (err) {
      if (isMountedRef.current) {
        setClubsError(extractErrorMessage(err, "Failed to load partner clubs."));
      }
    } finally {
      if (isMountedRef.current) {
        setClubsLoading(false);
      }
    }
  }, [currentClub?.slug, currentClub?.id]);

  // Fetch operator's own published upcoming events that can be linked
  const fetchOwnEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await eventsAPI.getAll({
        mine: "true",
        upcoming: "true",
        page_size: 50,
      });
      if (!isMountedRef.current) return;

      const rawEvents = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
        ? response.data.results
        : [];

      // Only published events that have not ended can be linked per backend contract
      const now = new Date();
      const valid = rawEvents.filter((e) => {
        if (e.status !== "published") return false;
        const endsAt = new Date(e.ends_at);
        return endsAt > now;
      });

      setEligibleEvents(valid);
    } catch {
      // Non-fatal if event list fails; event association is optional
      if (isMountedRef.current) {
        setEligibleEvents([]);
      }
    } finally {
      if (isMountedRef.current) {
        setEventsLoading(false);
      }
    }
  }, []);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitError("");
      setValidationErrors({});
      fetchClubs();
      fetchOwnEvents();
    }
  }, [isOpen, fetchClubs, fetchOwnEvents]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  // Filtered target clubs based on search query
  const filteredClubs = useMemo(() => {
    if (!clubSearchQuery.trim()) return availableClubs;
    const query = clubSearchQuery.toLowerCase().trim();
    return availableClubs.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.slug?.toLowerCase().includes(query)
    );
  }, [availableClubs, clubSearchQuery]);

  // Currently selected target club object
  const selectedClub = useMemo(() => {
    if (!targetClubSlug) return null;
    return availableClubs.find((c) => c.slug === targetClubSlug) || null;
  }, [availableClubs, targetClubSlug]);

  // Form Validation
  const validateForm = () => {
    const errors = {};

    if (!targetClubSlug) {
      errors.target_club = "Please select a partner club for this proposal.";
    } else if (
      currentClub?.slug &&
      targetClubSlug.toLowerCase() === currentClub.slug.toLowerCase()
    ) {
      errors.target_club = "You cannot send a collaboration request to your own club.";
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = "Proposal initiative title is required.";
    } else if (trimmedTitle.length > 200) {
      errors.title = "Title cannot exceed 200 characters.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        target_club: targetClubSlug,
        title: title.trim(),
      };

      if (description.trim()) {
        payload.description = description.trim();
      }

      if (selectedEventId) {
        payload.event = selectedEventId;
      }

      const response = await collaborationsAPI.create(payload);
      const createdCollab = response.data;

      // Reset form state
      setTargetClubSlug("");
      setTitle("");
      setDescription("");
      setSelectedEventId("");
      setClubSearchQuery("");
      setValidationErrors({});

      onSuccess(createdCollab);
    } catch (err) {
      if (!isMountedRef.current) return;

      if (err.response?.status === 409) {
        setSubmitError(
          err.response.data?.detail ||
            "A pending collaboration request already exists between these clubs."
        );
      } else if (err.response?.status === 400) {
        const data = err.response.data;
        if (data && typeof data === "object") {
          const fieldErrors = {};
          if (data.target_club) {
            fieldErrors.target_club = Array.isArray(data.target_club)
              ? data.target_club.join(" ")
              : data.target_club;
          }
          if (data.title) {
            fieldErrors.title = Array.isArray(data.title)
              ? data.title.join(" ")
              : data.title;
          }
          if (data.description) {
            fieldErrors.description = Array.isArray(data.description)
              ? data.description.join(" ")
              : data.description;
          }
          if (data.event) {
            fieldErrors.event = Array.isArray(data.event)
              ? data.event.join(" ")
              : data.event;
          }
          setValidationErrors(fieldErrors);
        }
        setSubmitError(
          extractErrorMessage(err, "Please correct the highlighted form errors.")
        );
      } else if (err.response?.status === 403) {
        setSubmitError(
          "Access denied. Only authenticated club operators can propose collaborations."
        );
      } else {
        setSubmitError(
          extractErrorMessage(
            err,
            "Failed to submit collaboration proposal. Please try again."
          )
        );
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="propose-collab-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        ref={modalContentRef}
        className="bg-surface-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-border-subtle flex flex-col gap-5 max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-surface-lavender text-primary flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[24px]">
                handshake
              </span>
            </div>
            <div>
              <h2
                id="propose-collab-title"
                className="text-lg font-extrabold text-on-surface tracking-tight"
              >
                Propose Inter-Club Collaboration
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Dispatch an official partnership proposal to another chartered university society.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="text-text-muted hover:text-on-surface p-1.5 rounded-full hover:bg-surface-lavender transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Informational Policy Strip (Direct from Stitch Protocol) */}
        <div className="p-3.5 rounded-2xl bg-surface-lavender/60 border border-border-subtle text-xs text-text-muted flex items-start gap-2.5 leading-relaxed">
          <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
            verified_user
          </span>
          <div>
            <span className="font-bold text-on-surface">Institutional Charter:</span>{" "}
            Submitting this proposal sends an official dispatch to the target club operator. Only one active pending request is permitted between any two clubs.
          </div>
        </div>

        {/* Global Error Alert */}
        {submitError && (
          <div className="p-4 rounded-2xl bg-error-container/30 border border-error/30 text-xs text-error flex items-start gap-2.5 leading-relaxed">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1 font-semibold">{submitError}</div>
          </div>
        )}

        {/* Proposal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Field 1: Target Club Selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="target-club-select"
              className="text-xs font-bold text-on-surface flex items-center justify-between"
            >
              <span>
                Target Partner Club <span className="text-error">*</span>
              </span>
              {availableClubs.length > 0 && (
                <span className="text-[11px] text-text-muted font-normal">
                  {availableClubs.length} societies eligible
                </span>
              )}
            </label>

            {/* Club Selection Dropdown */}
            {clubsLoading ? (
              <div className="h-11 px-3 rounded-xl bg-canvas-base border border-border-subtle flex items-center gap-2 text-xs text-text-muted">
                <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading university clubs...</span>
              </div>
            ) : clubsError ? (
              <div className="p-3 rounded-xl bg-error-container/20 border border-error/20 text-xs text-error flex items-center justify-between">
                <span>{clubsError}</span>
                <button
                  type="button"
                  onClick={fetchClubs}
                  className="font-bold underline text-xs ml-2"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="target-club-select"
                  value={targetClubSlug}
                  onChange={(e) => {
                    setTargetClubSlug(e.target.value);
                    if (validationErrors.target_club) {
                      setValidationErrors((prev) => ({ ...prev, target_club: "" }));
                    }
                  }}
                  required
                  className={`w-full h-11 px-3.5 pr-10 rounded-xl bg-surface-white text-xs font-semibold text-on-surface border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    validationErrors.target_club
                      ? "border-error focus:border-error"
                      : "border-border-subtle focus:border-primary"
                  }`}
                >
                  <option value="">-- Select a Chartered Club --</option>
                  {filteredClubs.map((club) => (
                    <option key={club.id || club.slug} value={club.slug}>
                      {club.name} (@{club.slug})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-text-muted text-[20px] absolute right-3 top-2.5 pointer-events-none">
                  expand_more
                </span>
              </div>
            )}

            {validationErrors.target_club && (
              <span className="text-[11px] text-error font-semibold">
                {validationErrors.target_club}
              </span>
            )}

            {/* Selected Club Preview Strip */}
            {selectedClub && (
              <div className="flex items-center gap-3 p-3 bg-surface-lavender/50 rounded-xl border border-border-subtle mt-1 animate-in fade-in duration-150">
                <div className="w-10 h-10 rounded-lg bg-surface-white flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-border-subtle shadow-xs">
                  {selectedClub.logo ? (
                    <img
                      src={selectedClub.logo}
                      alt={selectedClub.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    getClubMonogram(selectedClub.name)
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-on-surface truncate">
                    {selectedClub.name}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    @{selectedClub.slug} · Verified Campus Society
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-white text-primary text-[10px] font-bold border border-border-subtle">
                  Recipient
                </span>
              </div>
            )}
          </div>

          {/* Field 2: Proposal Title / Initiative Scope */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="propose-title"
                className="text-xs font-bold text-on-surface"
              >
                Proposal Title / Initiative Scope <span className="text-error">*</span>
              </label>
              <span className="text-[11px] text-text-muted font-mono">
                {title.length} / 200
              </span>
            </div>
            <input
              id="propose-title"
              type="text"
              maxLength={200}
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationErrors.title) {
                  setValidationErrors((prev) => ({ ...prev, title: "" }));
                }
              }}
              placeholder="e.g. Joint Tech-Debate Gala 2026: AI Ethics & National Policy"
              className={`w-full h-11 px-3.5 rounded-xl bg-surface-white text-xs text-on-surface placeholder:text-text-muted border transition-all font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                validationErrors.title
                  ? "border-error focus:border-error"
                  : "border-border-subtle focus:border-primary"
              }`}
            />
            {validationErrors.title && (
              <span className="text-[11px] text-error font-semibold">
                {validationErrors.title}
              </span>
            )}
          </div>

          {/* Field 3: Core Statement & Objectives (Optional Description) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="propose-description"
                className="text-xs font-bold text-on-surface"
              >
                Core Statement &amp; Objectives{" "}
                <span className="text-text-muted font-normal text-[11px]">
                  (Optional)
                </span>
              </label>
            </div>
            <textarea
              id="propose-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the proposed collaborative initiative, joint workshop format, technical judges, co-branding, or venue clearance goals..."
              className="w-full p-3.5 rounded-xl bg-surface-white text-xs text-on-surface placeholder:text-text-muted border border-border-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-normal leading-relaxed resize-y min-h-[90px]"
            />
          </div>

          {/* Field 4: Associated Campus Event (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="propose-event"
              className="text-xs font-bold text-on-surface flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[15px]">
                  calendar_month
                </span>
                <span>Link Published Event</span>
                <span className="text-text-muted font-normal text-[11px]">
                  (Optional)
                </span>
              </span>
              {eligibleEvents.length > 0 && (
                <span className="text-[11px] text-text-muted font-normal">
                  {eligibleEvents.length} upcoming events
                </span>
              )}
            </label>

            {eventsLoading ? (
              <div className="h-10 px-3 rounded-xl bg-canvas-base border border-border-subtle flex items-center gap-2 text-xs text-text-muted">
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Checking eligible club events...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="propose-event"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full h-11 px-3.5 pr-10 rounded-xl bg-surface-white text-xs font-medium text-on-surface border border-border-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="">
                    No specific event (General joint initiative / alliance)
                  </option>
                  {eligibleEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({formatDhakaDate(evt.starts_at)})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-text-muted text-[20px] absolute right-3 top-2.5 pointer-events-none">
                  expand_more
                </span>
              </div>
            )}
            <span className="text-[11px] text-text-muted">
              Only published, upcoming events belonging to your own club can be formally linked per university charter.
            </span>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle mt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-on-surface text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !targetClubSlug || !title.trim()}
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching Proposal...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    send
                  </span>
                  <span>Submit Proposal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

