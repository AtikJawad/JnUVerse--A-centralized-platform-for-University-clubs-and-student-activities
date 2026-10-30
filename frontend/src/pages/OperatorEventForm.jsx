import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { eventsAPI, extractErrorMessage } from "../services/api";
import LoadingState from "../components/LoadingState";
import ErrorAlert from "../components/ErrorAlert";
import Input from "../components/Input";
import Button from "../components/Button";
import Badge from "../components/Badge";

/**
 * Converts ISO 8601 timestamp to HTML datetime-local format "YYYY-MM-DDTHH:mm"
 * strictly evaluated in Asia/Dhaka (+06:00 BST) wall-clock time.
 * Avoids any manual hour manipulation or reliance on browser local timezone.
 */
export function isoToDhakaInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type) => parts.find((p) => p.type === type)?.value;
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts HTML datetime-local "YYYY-MM-DDTHH:mm" to an ISO 8601 string
 * with an explicit +06:00 Asia/Dhaka offset.
 */
export function dhakaInputToIso(inputValue) {
  if (!inputValue) return "";
  const clean = inputValue.slice(0, 16);
  return `${clean}:00+06:00`;
}

/**
 * Formats start and end dates for the live preview card in Asia/Dhaka.
 */
function formatDhakaPreview(startsAtInput, endsAtInput) {
  if (!startsAtInput) return "Schedule to be announced";
  const startIso = dhakaInputToIso(startsAtInput);
  const startDate = new Date(startIso);
  if (isNaN(startDate.getTime())) return "Invalid start time";

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const formattedStartDate = dateFormatter.format(startDate);
  const formattedStartTime = timeFormatter.format(startDate);

  if (!endsAtInput) {
    return `${formattedStartDate} • ${formattedStartTime} BST`;
  }

  const endIso = dhakaInputToIso(endsAtInput);
  const endDate = new Date(endIso);
  if (isNaN(endDate.getTime())) {
    return `${formattedStartDate} • ${formattedStartTime} BST`;
  }

  const formattedEndDate = dateFormatter.format(endDate);
  const formattedEndTime = timeFormatter.format(endDate);

  if (formattedStartDate === formattedEndDate) {
    return `${formattedStartDate} • ${formattedStartTime} – ${formattedEndTime} BST`;
  }
  return `${formattedStartDate}, ${formattedStartTime} – ${formattedEndDate}, ${formattedEndTime} BST`;
}

/**
 * OperatorEventForm Component — Week 4, Stage 5
 * Unified event creation and editing view for authenticated Club Operators.
 */
export default function OperatorEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(true);

  // Existing Event State (for Edit mode)
  const [existingEvent, setExistingEvent] = useState(null);
  const [originalStartsAt, setOriginalStartsAt] = useState("");
  const [loadingEvent, setLoadingEvent] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Feedback & Error States
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check editability in edit mode
  const isReadOnly = useMemo(() => {
    if (!isEditMode || !existingEvent) return false;
    if (existingEvent.status === "cancelled") return true;
    if (existingEvent.is_completed) return true;
    if (existingEvent.ends_at && new Date(existingEvent.ends_at) <= new Date()) return true;
    return false;
  }, [isEditMode, existingEvent]);

  const readOnlyReason = useMemo(() => {
    if (!isReadOnly || !existingEvent) return "";
    if (existingEvent.status === "cancelled") {
      return "This event has been cancelled and can no longer be edited.";
    }
    if (existingEvent.is_completed || (existingEvent.ends_at && new Date(existingEvent.ends_at) <= new Date())) {
      return "This event has already ended and can no longer be edited.";
    }
    return "";
  }, [isReadOnly, existingEvent]);

  // Load existing event data in edit mode
  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setLoadingEvent(true);
    setGeneralError("");

    try {
      const res = await eventsAPI.getById(id);
      const data = res.data;
      setExistingEvent(data);
      setTitle(data.title || "");
      setDescription(data.description || "");
      setVenue(data.venue || "");
      setOriginalStartsAt(data.starts_at || "");
      setStartsAt(isoToDhakaInput(data.starts_at));
      setEndsAt(isoToDhakaInput(data.ends_at));

      if (data.capacity === null || data.capacity === undefined) {
        setUnlimitedCapacity(true);
        setCapacity("");
      } else {
        setUnlimitedCapacity(false);
        setCapacity(String(data.capacity));
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setGeneralError("Event not found or you do not have permission to access it.");
      } else if (err.response?.status === 403) {
        setGeneralError("Only the operator of this club has permission to edit this event.");
      } else {
        setGeneralError(extractErrorMessage(err, "Failed to load event details."));
      }
    } finally {
      setLoadingEvent(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      fetchEvent();
    }
  }, [isEditMode, fetchEvent]);

  // Client-side validation
  const validateForm = () => {
    const errors = {};

    if (!title.trim()) {
      errors.title = "Event title is required.";
    } else if (title.trim().length > 200) {
      errors.title = "Event title cannot exceed 200 characters.";
    }

    if (!venue.trim()) {
      errors.venue = "Venue location is required.";
    } else if (venue.trim().length > 200) {
      errors.venue = "Venue location cannot exceed 200 characters.";
    }

    if (!startsAt) {
      errors.starts_at = "Start date and time are required.";
    }

    if (!endsAt) {
      errors.ends_at = "End date and time are required.";
    }

    if (startsAt && endsAt) {
      const startIso = dhakaInputToIso(startsAt);
      const endIso = dhakaInputToIso(endsAt);
      const startDate = new Date(startIso);
      const endDate = new Date(endIso);
      const now = new Date();

      // Check future start time:
      // In create mode: start time must be in future
      // In edit mode: only enforce future start time if operator actually modified startsAt
      const startsAtModified =
        !isEditMode ||
        (originalStartsAt && isoToDhakaInput(originalStartsAt) !== startsAt);

      if (startsAtModified && startDate <= now) {
        errors.starts_at = "Start time must be in the future.";
      }

      if (endDate <= startDate) {
        errors.ends_at = "End time must be after the start time.";
      }
    }

    if (!unlimitedCapacity && capacity.trim()) {
      const num = Number(capacity.trim());
      if (!Number.isInteger(num) || num < 1) {
        errors.capacity = "Capacity must be a positive integer.";
      } else if (
        isEditMode &&
        existingEvent?.registered_count &&
        num < existingEvent.registered_count
      ) {
        errors.capacity = `Capacity cannot be lower than the current number of registrations (${existingEvent.registered_count}).`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setSuccessMessage("");

    if (isReadOnly) {
      setGeneralError(readOnlyReason || "This event cannot be edited.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        starts_at: dhakaInputToIso(startsAt),
        ends_at: dhakaInputToIso(endsAt),
        capacity: unlimitedCapacity
          ? null
          : capacity.trim()
          ? parseInt(capacity.trim(), 10)
          : null,
      };

      let savedEvent;
      if (isEditMode) {
        const res = await eventsAPI.update(id, payload);
        savedEvent = res.data;
        setSuccessMessage("Event changes saved successfully!");
      } else {
        const res = await eventsAPI.create(payload);
        savedEvent = res.data;
        setSuccessMessage("Event draft created successfully!");
      }

      // Smoothly redirect to event detail view
      setTimeout(() => {
        navigate(`/events/${savedEvent.id}`);
      }, 1000);
    } catch (err) {
      if (err.response?.status === 409) {
        setGeneralError(
          err.response.data?.detail ||
            "Cancelled or ended events cannot be edited."
        );
      } else if (
        err.response?.status === 400 &&
        typeof err.response.data === "object"
      ) {
        const serverFieldErrors = {};
        let hasDetail = false;
        Object.entries(err.response.data).forEach(([key, val]) => {
          if (key === "detail" || key === "non_field_errors") {
            hasDetail = true;
            setGeneralError(Array.isArray(val) ? val.join(" ") : String(val));
          } else {
            serverFieldErrors[key] = Array.isArray(val) ? val.join(" ") : String(val);
          }
        });
        setFieldErrors(serverFieldErrors);
        if (!hasDetail && Object.keys(serverFieldErrors).length > 0) {
          setGeneralError("Please review the highlighted fields below.");
        }
      } else if (err.response?.status === 403) {
        setGeneralError(
          "Permission denied. Only the operator of this club can manage this event."
        );
      } else if (err.response?.status === 404) {
        setGeneralError("Event not found or you do not have permission to access it.");
      } else {
        setGeneralError(extractErrorMessage(err, "Failed to save event."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Club name resolution
  const clubName = existingEvent?.club?.name || user?.name || "Your Student Guild";

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-20">
          <LoadingState message="Loading event information..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col font-sans text-on-surface antialiased">
      <Navbar />

      <main className="flex-1 w-full pt-20 pb-16">
        {/* Subtle ambient gradient aura */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[880px] h-96 bg-gradient-to-b from-surface-lavender/60 via-secondary-fixed/20 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Breadcrumb Trail */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs font-semibold text-text-muted"
            >
              <Link
                to="/events"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Events</span>
              </Link>
              <span>/</span>
              {isEditMode ? (
                <>
                  <Link
                    to={`/events/${id}`}
                    className="hover:text-primary transition-colors truncate max-w-[200px]"
                  >
                    {existingEvent?.title || "Event Detail"}
                  </Link>
                  <span>/</span>
                  <span className="text-on-surface font-bold">Edit Event</span>
                </>
              ) : (
                <span className="text-on-surface font-bold">Create Event</span>
              )}
            </nav>

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-lavender text-primary text-[11px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">badge</span>
                    Operator Workspace
                  </span>
                  {isEditMode && existingEvent?.status && (
                    <Badge
                      variant={
                        existingEvent.status === "published"
                          ? "success"
                          : existingEvent.status === "cancelled"
                          ? "error"
                          : "warning"
                      }
                      size="sm"
                    >
                      {existingEvent.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
                  {isEditMode ? "Edit Campus Event" : "Create New Campus Event"}
                </h1>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
                  {isEditMode
                    ? `Update event logistics, schedule, and capacity limits for ${clubName}.`
                    : `Draft a new campus event for ${clubName}. New events start in draft status and can be published when ready.`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={isEditMode ? `/events/${id}` : "/events"}
                  className="px-4 py-2 rounded-full border border-border-subtle bg-surface-white hover:bg-surface-lavender text-xs font-semibold text-text-muted hover:text-on-surface transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>

            {/* Feedback Notifications */}
            {successMessage && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-950 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                    check_circle
                  </span>
                  <span className="font-semibold">{successMessage}</span>
                </div>
                <span className="text-emerald-700 text-xs font-medium">Redirecting...</span>
              </div>
            )}

            {generalError && (
              <ErrorAlert
                title="Action Notice"
                message={generalError}
                onDismiss={() => setGeneralError("")}
              />
            )}

            {isReadOnly && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-950 text-xs sm:text-sm leading-relaxed"
              >
                <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">
                  lock
                </span>
                <div>
                  <span className="font-bold block">Read-Only Mode</span>
                  <span>{readOnlyReason}</span>
                </div>
              </div>
            )}

            {/* 12-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* ============================================================ */}
              {/* LEFT COLUMN: Event Creation & Edit Form (7 cols on lg)       */}
              {/* ============================================================ */}
              <div className="lg:col-span-7 space-y-6">
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="bg-surface-white rounded-3xl p-6 sm:p-8 shadow-xs border border-border-subtle space-y-6"
                >
                  {/* Section A: Title & Overview */}
                  <div className="space-y-4">
                    <div className="border-b border-border-subtle/70 pb-3">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          campaign
                        </span>
                        <span>Basic Information</span>
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        Define how this event will appear in university listings and search results.
                      </p>
                    </div>

                    {/* Title Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="event-title"
                          className="block text-xs font-semibold text-on-surface uppercase tracking-wider"
                        >
                          Event Title <span className="text-error">*</span>
                        </label>
                        <span className="text-[11px] text-text-muted font-mono">
                          {title.length} / 200
                        </span>
                      </div>
                      <Input
                        id="event-title"
                        name="title"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (fieldErrors.title) {
                            setFieldErrors((prev) => ({ ...prev, title: "" }));
                          }
                        }}
                        placeholder="e.g. Annual IT Techfest & Hackathon 2026"
                        maxLength={200}
                        required
                        disabled={submitting || isReadOnly}
                        error={fieldErrors.title}
                        icon={
                          <span className="material-symbols-outlined text-[18px]">
                            campaign
                          </span>
                        }
                      />
                      {fieldErrors.title && (
                        <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          <span>{fieldErrors.title}</span>
                        </p>
                      )}
                    </div>

                    {/* Description Textarea */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="event-description"
                          className="block text-xs font-semibold text-on-surface uppercase tracking-wider"
                        >
                          Description <span className="text-text-muted font-normal">(Optional)</span>
                        </label>
                        <span className="text-[11px] text-text-muted font-mono">
                          {description.length} chars
                        </span>
                      </div>
                      <textarea
                        id="event-description"
                        name="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide details about the schedule, requirements, key speakers, or registration guidelines..."
                        rows={4}
                        disabled={submitting || isReadOnly}
                        className="w-full p-4 rounded-xl bg-surface-white text-on-surface placeholder:text-text-muted/50 border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all outline-none text-xs sm:text-sm leading-relaxed resize-y min-h-[110px]"
                      />
                      <p className="text-[11px] text-text-muted">
                        Markdown or plain text describing the agenda and guidelines for students.
                      </p>
                    </div>
                  </div>

                  {/* Section B: Logistics & Schedule */}
                  <div className="space-y-4 pt-4 border-t border-border-subtle/80">
                    <div className="border-b border-border-subtle/70 pb-3">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          location_on
                        </span>
                        <span>Logistics &amp; Schedule</span>
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        Set where and when the event takes place. All times use Bangladesh Standard Time (Asia/Dhaka).
                      </p>
                    </div>

                    {/* Venue Location */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="event-venue"
                          className="block text-xs font-semibold text-on-surface uppercase tracking-wider"
                        >
                          Venue Location <span className="text-error">*</span>
                        </label>
                        <span className="text-[11px] text-text-muted font-mono">
                          {venue.length} / 200
                        </span>
                      </div>
                      <Input
                        id="event-venue"
                        name="venue"
                        value={venue}
                        onChange={(e) => {
                          setVenue(e.target.value);
                          if (fieldErrors.venue) {
                            setFieldErrors((prev) => ({ ...prev, venue: "" }));
                          }
                        }}
                        placeholder="e.g. JnU Central Auditorium, Ground Floor"
                        maxLength={200}
                        required
                        disabled={submitting || isReadOnly}
                        error={fieldErrors.venue}
                        icon={
                          <span className="material-symbols-outlined text-[18px]">
                            location_on
                          </span>
                        }
                      />
                      {fieldErrors.venue && (
                        <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          <span>{fieldErrors.venue}</span>
                        </p>
                      )}
                    </div>

                    {/* Start & End Times Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Starts At */}
                      <div className="space-y-1">
                        <label
                          htmlFor="event-starts-at"
                          className="block text-xs font-semibold text-on-surface uppercase tracking-wider"
                        >
                          Start Date &amp; Time <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="event-starts-at"
                            name="starts_at"
                            type="datetime-local"
                            value={startsAt}
                            onChange={(e) => {
                              setStartsAt(e.target.value);
                              if (fieldErrors.starts_at) {
                                setFieldErrors((prev) => ({ ...prev, starts_at: "" }));
                              }
                            }}
                            required
                            disabled={submitting || isReadOnly}
                            className={`w-full h-11 px-3.5 rounded-xl bg-surface-white text-on-surface text-xs sm:text-sm border transition-all outline-none shadow-xs disabled:bg-surface-lavender/40 disabled:cursor-not-allowed ${
                              fieldErrors.starts_at
                                ? "border-error bg-error-container/10 focus:border-error focus:ring-2 focus:ring-error/20"
                                : "border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
                            }`}
                          />
                        </div>
                        {fieldErrors.starts_at ? (
                          <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>{fieldErrors.starts_at}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-text-muted">Dhaka BST (UTC+6)</p>
                        )}
                      </div>

                      {/* Ends At */}
                      <div className="space-y-1">
                        <label
                          htmlFor="event-ends-at"
                          className="block text-xs font-semibold text-on-surface uppercase tracking-wider"
                        >
                          End Date &amp; Time <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="event-ends-at"
                            name="ends_at"
                            type="datetime-local"
                            value={endsAt}
                            onChange={(e) => {
                              setEndsAt(e.target.value);
                              if (fieldErrors.ends_at) {
                                setFieldErrors((prev) => ({ ...prev, ends_at: "" }));
                              }
                            }}
                            required
                            disabled={submitting || isReadOnly}
                            className={`w-full h-11 px-3.5 rounded-xl bg-surface-white text-on-surface text-xs sm:text-sm border transition-all outline-none shadow-xs disabled:bg-surface-lavender/40 disabled:cursor-not-allowed ${
                              fieldErrors.ends_at
                                ? "border-error bg-error-container/10 focus:border-error focus:ring-2 focus:ring-error/20"
                                : "border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
                            }`}
                          />
                        </div>
                        {fieldErrors.ends_at ? (
                          <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>{fieldErrors.ends_at}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-text-muted">Must occur after start time</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section C: Capacity Configuration */}
                  <div className="space-y-4 pt-4 border-t border-border-subtle/80">
                    <div className="border-b border-border-subtle/70 pb-3">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          groups
                        </span>
                        <span>Registration Capacity</span>
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        Configure attendee capacity limits or leave unrestricted for open seating.
                      </p>
                    </div>

                    {/* Unlimited Capacity Checkbox */}
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-lavender/50 border border-border-subtle">
                      <input
                        type="checkbox"
                        id="unlimited-capacity-check"
                        checked={unlimitedCapacity}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUnlimitedCapacity(checked);
                          if (checked) {
                            setCapacity("");
                            if (fieldErrors.capacity) {
                              setFieldErrors((prev) => ({ ...prev, capacity: "" }));
                            }
                          }
                        }}
                        disabled={submitting || isReadOnly}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor="unlimited-capacity-check"
                        className="text-xs font-semibold text-on-surface cursor-pointer select-none"
                      >
                        Unlimited Capacity (No seat limit enforced)
                      </label>
                    </div>

                    {/* Capacity Numeric Input */}
                    {!unlimitedCapacity && (
                      <div className="space-y-1">
                        <label
                          htmlFor="event-capacity"
                          className="block text-xs font-semibold text-on-surface uppercase tracking-wider"
                        >
                          Maximum Attendees (Seats) <span className="text-error">*</span>
                        </label>
                        <Input
                          id="event-capacity"
                          name="capacity"
                          type="number"
                          min="1"
                          value={capacity}
                          onChange={(e) => {
                            setCapacity(e.target.value);
                            if (fieldErrors.capacity) {
                              setFieldErrors((prev) => ({ ...prev, capacity: "" }));
                            }
                          }}
                          placeholder="e.g. 100"
                          required={!unlimitedCapacity}
                          disabled={submitting || isReadOnly}
                          error={fieldErrors.capacity}
                          icon={
                            <span className="material-symbols-outlined text-[18px]">
                              groups
                            </span>
                          }
                        />
                        {fieldErrors.capacity && (
                          <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span>{fieldErrors.capacity}</span>
                          </p>
                        )}
                        {isEditMode && existingEvent?.registered_count > 0 && (
                          <p className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px] text-primary">
                              info
                            </span>
                            <span>
                              Current registrations: <strong>{existingEvent.registered_count}</strong>.
                              Capacity cannot be reduced below this count.
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section D: Form Action Buttons */}
                  <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link
                      to={isEditMode ? `/events/${id}` : "/events"}
                      className="text-xs font-semibold text-text-muted hover:text-on-surface transition-colors py-2"
                    >
                      Cancel &amp; Discard
                    </Link>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={submitting || isReadOnly}
                      isLoading={submitting}
                      className="w-full sm:w-auto px-8 py-2.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        save
                      </span>
                      <span>{isEditMode ? "Save Changes" : "Save Draft"}</span>
                    </Button>
                  </div>
                </form>
              </div>

              {/* ============================================================ */}
              {/* RIGHT COLUMN: Live Public Event Card Preview (5 cols on lg)  */}
              {/* ============================================================ */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
                {/* Preview Box */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        visibility
                      </span>
                      <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                        Live Public Preview
                      </h2>
                    </div>
                    <span className="text-[11px] font-semibold text-text-muted bg-surface-lavender px-2.5 py-0.5 rounded-full border border-border-subtle">
                      Real-time
                    </span>
                  </div>

                  <p className="text-xs text-text-muted px-1">
                    This card reflects how campus students will view your event in the discovery explorer.
                  </p>

                  {/* Live Rendered Card */}
                  <article className="w-full bg-surface-white rounded-3xl overflow-hidden border border-border-subtle shadow-xs space-y-0 transition-all">
                    {/* Visual Card Cover / Backdrop Plate */}
                    <div className="h-32 bg-gradient-to-br from-surface-lavender via-secondary-fixed/40 to-surface-lavender/30 p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-surface-white flex items-center justify-center text-primary font-bold shadow-xs">
                            <span className="material-symbols-outlined text-[18px]">
                              campaign
                            </span>
                          </div>
                          <span className="text-xs font-bold text-on-surface truncate max-w-[180px]">
                            {clubName}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {isEditMode && existingEvent?.status
                            ? existingEvent.status.toUpperCase()
                            : "DRAFT"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-medium relative z-10 truncate">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          location_on
                        </span>
                        <span className="truncate">
                          {venue || "Venue to be announced"}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 space-y-4">
                      {/* Schedule Tag */}
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          calendar_today
                        </span>
                        <span className="font-semibold text-on-surface">
                          {formatDhakaPreview(startsAt, endsAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-on-surface line-clamp-2 leading-tight">
                        {title || "Untitled Campus Event"}
                      </h3>

                      {/* Description preview */}
                      <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                        {description ||
                          "No description provided yet. Add details on the left to let students know about your event."}
                      </p>

                      {/* Capacity Ribbon */}
                      <div className="pt-2 border-t border-border-subtle/80 flex items-center justify-between text-xs text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            groups
                          </span>
                          <span>
                            {unlimitedCapacity
                              ? "Unlimited Capacity"
                              : capacity
                              ? `${capacity} seats max`
                              : "Unlimited Capacity"}
                          </span>
                        </span>

                        <span className="text-[11px] text-primary font-bold">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Operator Guidelines Box */}
                <div className="p-5 rounded-2xl bg-surface-lavender/50 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <span>Event Lifecycle Guidelines</span>
                  </div>
                  <ul className="space-y-1.5 text-text-muted list-disc list-inside leading-relaxed">
                    <li>Newly created events start as <strong>Drafts</strong> and are visible only to you.</li>
                    <li>Publishing and event cancellation actions are available in Stage 6.</li>
                    <li>Dates and schedules are strictly preserved in <strong>Asia/Dhaka (+06:00 BST)</strong>.</li>
                    <li>Once published, events can be edited until their scheduled end time.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-border-subtle mt-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
            <p>© 2026 Jagannath University (JnUVerse). All rights reserved.</p>
            <p>Club Operator Event Portal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
