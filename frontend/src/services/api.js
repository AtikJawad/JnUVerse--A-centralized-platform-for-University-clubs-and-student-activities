import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Queue to hold requests while a token refresh is in flight
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: Attach access token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response or not 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints (login, refresh, register) or if already retried
    const url = originalRequest.url || "";
    const isAuthEndpoint =
      url.includes("/api/auth/login/") ||
      url.includes("/api/auth/refresh/") ||
      url.includes("/api/auth/register/");

    if (isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      // No refresh token available, clear any stale auth and reject
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Refresh in flight: queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
        refresh: refreshToken,
      });

      const { access, refresh: newRefresh } = response.data;
      localStorage.setItem("access_token", access);
      if (newRefresh) {
        localStorage.setItem("refresh_token", newRefresh);
      }

      api.defaults.headers.common.Authorization = `Bearer ${access}`;
      originalRequest.headers.Authorization = `Bearer ${access}`;

      processQueue(null, access);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Helper to extract server error messages from DRF error responses.
 * DRF typically returns:
 * - { "detail": "string" }
 * - { "non_field_errors": ["string"] }
 * - { "field_name": ["error1", "error2"] }
 * - { "message": "string" }
 */
export function extractErrorMessage(error, defaultMessage = "An error occurred.") {
  if (!error) return defaultMessage;
  if (!error.response) {
    if (error.request) {
      return `Unable to reach the server. Please verify the backend is reachable at ${API_BASE_URL}.`;
    }
    return error.message || defaultMessage;
  }

  const { data, status } = error.response;
  if (!data) {
    return `Request failed with status code ${status}.`;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.message) {
    return data.message;
  }

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors.join(" ");
  }

  // Combine field errors if present
  const messages = [];
  for (const [key, value] of Object.entries(data)) {
    const formattedKey = key === "non_field_errors" ? "" : `${key}: `;
    if (Array.isArray(value)) {
      messages.push(`${formattedKey}${value.join(", ")}`);
    } else if (typeof value === "string") {
      messages.push(`${formattedKey}${value}`);
    } else if (typeof value === "object" && value !== null) {
      messages.push(`${formattedKey}${JSON.stringify(value)}`);
    }
  }

  return messages.length > 0 ? messages.join(" | ") : defaultMessage;
}

/**
 * Fetches every page of a paginated DRF list endpoint and returns the combined results.
 * Uses page_size=50 (the backend maximum). `maxPages` is a safety ceiling.
 */
export async function fetchAllPages(url, params = {}, maxPages = 40) {
  let results = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await api.get(url, { params: { ...params, page, page_size: 50 } });
    const data = res.data;
    if (Array.isArray(data)) return data;
    const pageResults = data?.results || [];
    results = results.concat(pageResults);
    if (!data?.next || pageResults.length === 0) break;
  }
  return results;
}

/**
 * Sends a single file as multipart/form-data with PUT.
 * The shared instance defaults to Content-Type: application/json, and Axios
 * converts FormData to JSON when that header is set, so the header must be
 * overridden here (the browser adds the multipart boundary).
 * @param {string} url - Endpoint URL
 * @param {string} field - Form field name expected by the backend ("logo" | "banner")
 * @param {File} file - Image file selected by the user
 */
function putImage(url, field, file) {
  const formData = new FormData();
  formData.append(field, file);
  return api.put(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Clubs API Service — Centralized club discovery and lookup endpoints
 */
export const clubsAPI = {
  /**
   * List public clubs with optional search and pagination.
   * Endpoint: GET /api/clubs/
   * @param {Object} [params] - Axios query params (search, page, page_size)
   */
  getAll: (params) => api.get("/api/clubs/", { params }),

  /**
   * Retrieve single club public profile by slug.
   * Endpoint: GET /api/clubs/:slug/
   * @param {string} slug - Club slug
   */
  getBySlug: (slug) => api.get(`/api/clubs/${slug}/`),

  /**
   * Update the club profile (owning Club Operator only).
   * Endpoint: PATCH /api/clubs/:slug/
   * `interests` replaces the whole selection ([] clears). `logo` is ignored — use uploadLogo.
   * @param {string} slug - Club slug
   * @param {Object} payload - { description, contact_email, interests: [uuid] }
   */
  update: (slug, payload) => api.patch(`/api/clubs/${slug}/`, payload),

  /**
   * Upload or replace the club logo (owning Club Operator only).
   * Endpoint: PUT /api/clubs/:slug/logo/ (multipart field `logo`; JPEG/PNG/WebP, max 2 MB)
   * Returns the full Club object with the new `logo` URL.
   * @param {string} slug - Club slug
   * @param {File} file - Image file
   */
  uploadLogo: (slug, file) => putImage(`/api/clubs/${slug}/logo/`, "logo", file),

  /**
   * Remove the club logo (owning Club Operator only). Idempotent, 204 No Content.
   * Endpoint: DELETE /api/clubs/:slug/logo/
   * @param {string} slug - Club slug
   */
  deleteLogo: (slug) => api.delete(`/api/clubs/${slug}/logo/`),
};

/**
 * Events API Service — Week 4 Backend Integration
 * Encapsulates backend-verified endpoints for event discovery,
 * operator event lifecycle management, and student RSVP registrations.
 */
export const eventsAPI = {
  /**
   * List visible events with optional query parameters.
   * Query params: club, upcoming, mine, registered, search, page, page_size
   * @param {Object} [params] - Axios query params
   */
  getAll: (params) => api.get("/api/events/", { params }),

  /**
   * Retrieve single event detail by UUID.
   * @param {string} id - Event UUID
   */
  getById: (id) => api.get(`/api/events/${id}/`),

  /**
   * Create a new draft event (Club Operator only for own club).
   * @param {Object} payload - { title, description, venue, starts_at, ends_at, capacity }
   */
  create: (payload) => api.post("/api/events/", payload),

  /**
   * Partial update an event (Club Operator only for own club).
   * Note: Cancelled or ended events cannot be edited (returns 409).
   * @param {string} id - Event UUID
   * @param {Object} payload - { title, description, venue, starts_at, ends_at, capacity }
   */
  update: (id, payload) => api.patch(`/api/events/${id}/`, payload),

  /**
   * Publish a draft event (Club Operator only).
   * Transitions status from draft -> published.
   * @param {string} id - Event UUID
   */
  publish: (id) => api.post(`/api/events/${id}/publish/`),

  /**
   * Cancel a published event (Club Operator only).
   * Transitions status to cancelled. Irreversible.
   * @param {string} id - Event UUID
   */
  cancel: (id) => api.post(`/api/events/${id}/cancel/`),

  /**
   * Register for an event / RSVP (Student only).
   * Idempotent: 201 Created or 200 OK.
   * Returns 409 Conflict if full, not published, or after starts_at.
   * @param {string} id - Event UUID
   */
  register: (id) => api.post(`/api/events/${id}/register/`),

  /**
   * Cancel registration for an event / cancel RSVP (Student only).
   * Idempotent: 204 No Content.
   * Returns 409 Conflict if event has already started.
   * @param {string} id - Event UUID
   */
  unregister: (id) => api.delete(`/api/events/${id}/register/`),

  /**
   * List students currently registered for an event (Club Operator only for own club).
   * Paginated; student emails are strictly omitted.
   * @param {string} id - Event UUID
   * @param {Object} [params] - { page, page_size }
   */
  getRegistrations: (id, params) =>
    api.get(`/api/events/${id}/registrations/`, { params }),

  /**
   * Upload or replace the event banner (owning Club Operator only).
   * Endpoint: PUT /api/events/:id/banner/ (multipart field `banner`; JPEG/PNG/WebP, max 5 MB)
   * Returns the full Event object. 409 for cancelled or ended events.
   * @param {string} id - Event UUID
   * @param {File} file - Image file
   */
  uploadBanner: (id, file) => putImage(`/api/events/${id}/banner/`, "banner", file),

  /**
   * Remove the event banner (owning Club Operator only). 204 No Content.
   * Endpoint: DELETE /api/events/:id/banner/
   * @param {string} id - Event UUID
   */
  deleteBanner: (id) => api.delete(`/api/events/${id}/banner/`),

  /**
   * Mark attendance (owning Club Operator only) — Week 8.
   * Endpoint: PUT /api/events/:id/attendance/
   * Replaces the attended set: listed registrations become attended, every other current
   * registration becomes not attended (send the full set each time; [] clears).
   * Returns { registered, attended }. 409 if the event is not published or has not started;
   * 400 if an id is not a current registration of this event.
   * @param {string} id - Event UUID
   * @param {string[]} registrationIds - Registration UUIDs (from getRegistrations)
   */
  setAttendance: (id, registrationIds) =>
    api.put(`/api/events/${id}/attendance/`, { registration_ids: registrationIds }),
};

/**
 * Notices API Service — Week 5 Backend Integration
 * Encapsulates backend-verified endpoints for club announcements,
 * audience scoping (public, followers, members, department), and operator management.
 */
export const noticesAPI = {
  /**
   * List notices with audience filtering and pagination.
   * Query params: club, mine, page, page_size
   * - Public notices visible to all.
   * - Followers notices visible to followers and approved members.
   * - Members notices visible to approved members only.
   * - Department notices visible to students of that department.
   * - `mine=true` returns all own club notices (operator only).
   * @param {Object} [params] - Axios query params
   */
  getAll: (params) => api.get("/api/notices/", { params }),

  /**
   * Retrieve single notice detail by UUID.
   * Returns 200 or 404 (if notice not found or user outside allowed audience).
   * @param {string} id - Notice UUID
   */
  getById: (id) => api.get(`/api/notices/${id}/`),

  /**
   * Create a new notice (Club Operator only for own club).
   * Publishes immediately and creates in-app notifications.
   * @param {Object} payload - { title, body, audience, department? }
   * - audience: "public" | "followers" | "members" | "department"
   * - department: required if audience === "department", disallowed otherwise.
   */
  create: (payload) => api.post("/api/notices/", payload),

  /**
   * Update a notice (Owning Club Operator only).
   * Note: Only `title` and `body` can be updated; audience and department are immutable.
   * @param {string} id - Notice UUID
   * @param {Object} payload - { title?, body? }
   */
  update: (id, payload) => api.patch(`/api/notices/${id}/`, payload),

  /**
   * Delete a notice (Owning Club Operator only).
   * Returns 204 No Content. Cascades deletion to related notifications.
   * @param {string} id - Notice UUID
   */
  delete: (id) => api.delete(`/api/notices/${id}/`),
};

/**
 * Notifications API Service — Week 5 Backend Integration
 * Encapsulates backend-verified endpoints for in-app personal notifications,
 * unread counter polling, and mark-as-read operations.
 */
export const notificationsAPI = {
  /**
   * List personal notifications for the authenticated user (newest first).
   * Query params: unread (boolean, e.g. "true"), page, page_size
   * @param {Object} [params] - Axios query params
   */
  getAll: (params) => api.get("/api/notifications/", { params }),

  /**
   * Retrieve unread notifications count for navbar badge.
   * Lightweight endpoint returning { unread_count: N }.
   */
  getUnreadCount: () => api.get("/api/notifications/unread-count/"),

  /**
   * Mark a single notification as read (Idempotent POST).
   * Returns updated Notification object.
   * @param {string} id - Notification UUID
   */
  markRead: (id) => api.post(`/api/notifications/${id}/read/`),

  /**
   * Mark all unread notifications as read for current user.
   * Returns { updated: N }.
   */
  markAllRead: () => api.post("/api/notifications/read-all/"),
};

/**
 * Auth API Service — Common institutional lookup endpoints
 */
export const authAPI = {
  /**
   * Retrieve official university departments list from backend.
   * Endpoint: GET /api/auth/departments/
   */
  getDepartments: () => api.get("/api/auth/departments/"),
};

/**
 * Event Ratings API Service — Week 6 Backend Integration
 * Encapsulates backend-verified endpoints for attendee 1–5 star ratings (no comments)
 * and owning club operator aggregate rating summaries.
 */
export const ratingsAPI = {
  /**
   * Submit or update an event rating (Student attendee only).
   * Endpoint: PUT /api/events/:id/rating/
   * - First rating returns 201 Created.
   * - Updated rating inside the 7-day post-event window returns 200 OK.
   * - Returns the full updated Event object (average_rating, rating_count, my_rating).
   * - 403 Forbidden if student not registered.
   * - 409 Conflict if not published, not ended, or > 7 days after ends_at.
   * @param {string} eventId - Event UUID
   * @param {number} rating - Integer between 1 and 5
   */
  submitRating: (eventId, rating) =>
    api.put(`/api/events/${eventId}/rating/`, { rating }),

  /**
   * Retrieve the authenticated student's own rating for an event.
   * Endpoint: GET /api/events/:id/rating/
   * Returns: { rating: number | null }
   * @param {string} eventId - Event UUID
   */
  getMyRating: (eventId) =>
    api.get(`/api/events/${eventId}/rating/`),

  /**
   * Retrieve event rating summary with 1-5 star distribution breakdown
   * (Owning Club Operator only).
   * Endpoint: GET /api/events/:id/rating-summary/
   * Returns: { average: number | null, count: number, breakdown: { "1": N, "2": N, "3": N, "4": N, "5": N } }
   * - 403 Forbidden if not the operator of the event's club.
   * @param {string} eventId - Event UUID
   */
  getRatingSummary: (eventId) =>
    api.get(`/api/events/${eventId}/rating-summary/`),
};

/**
 * Collaborations API Service — Week 6 Backend Integration
 * Encapsulates backend-verified endpoints for inter-club collaboration requests,
 * request lifecycle management (accept, reject, cancel), and public partner clubs.
 */
export const collaborationsAPI = {
  /**
   * List collaboration requests involving the operator's own club.
   * Endpoint: GET /api/collaborations/
   * Query params:
   * - box: "sent" | "received" (default: both)
   * - status: "pending" | "accepted" | "rejected" | "cancelled"
   * - page: integer
   * - page_size: integer
   * @param {Object} [params] - Axios query params
   */
  getAll: (params) => api.get("/api/collaborations/", { params }),

  /**
   * Retrieve single collaboration request detail by UUID.
   * Accessible only to the requesting or target club operator.
   * Endpoint: GET /api/collaborations/:id/
   * @param {string} id - Collaboration UUID
   */
  getById: (id) => api.get(`/api/collaborations/${id}/`),

  /**
   * Propose a new collaboration request to another club (Club Operator only).
   * Endpoint: POST /api/collaborations/
   * Payload:
   * - target_club (string, required): slug of the target club
   * - title (string, required): max 200 chars
   * - description (string, optional): proposal text
   * - event (string, optional): UUID of published, not-yet-ended own club event
   * Returns: 201 Created with Collaboration object
   * Errors: 400 validation error, 409 Conflict if pending request already exists between clubs.
   * @param {Object} payload - { target_club, title, description?, event? }
   */
  create: (payload) => api.post("/api/collaborations/", payload),

  /**
   * Accept an incoming pending collaboration request (Target Club Operator only).
   * Endpoint: POST /api/collaborations/:id/accept/
   * Transitions status from "pending" -> "accepted" and establishes partner club status.
   * @param {string} id - Collaboration UUID
   */
  accept: (id) => api.post(`/api/collaborations/${id}/accept/`),

  /**
   * Reject an incoming pending collaboration request (Target Club Operator only).
   * Endpoint: POST /api/collaborations/:id/reject/
   * Transitions status from "pending" -> "rejected".
   * @param {string} id - Collaboration UUID
   */
  reject: (id) => api.post(`/api/collaborations/${id}/reject/`),

  /**
   * Cancel an outgoing pending collaboration request (Requesting Club Operator only).
   * Endpoint: POST /api/collaborations/:id/cancel/
   * Transitions status from "pending" -> "cancelled".
   * @param {string} id - Collaboration UUID
   */
  cancel: (id) => api.post(`/api/collaborations/${id}/cancel/`),

  /**
   * List public partner clubs for a club (at least one accepted collaboration).
   * Endpoint: GET /api/clubs/:slug/partners/
   * Public: Accessible to anonymous, students, and operators.
   * Paginated: returns { count, next, previous, results: [ Partner ] }
   * Partner object: { id, name, slug, logo, partner_since }
   * @param {string} clubSlug - Club slug
   * @param {Object} [params] - Axios query params (page, page_size)
   */
  getPartners: (clubSlug, params) =>
    api.get(`/api/clubs/${clubSlug}/partners/`, { params }),
};

/**
 * Interests API Service — Week 7 Backend Integration
 * Fixed list of 13 interests shared by students and clubs.
 */
export const interestsAPI = {
  /**
   * List all interests (public), sorted by name.
   * Endpoint: GET /api/auth/interests/ → { interests: [{ id, name }] }
   */
  getAll: () => api.get("/api/auth/interests/"),

  /**
   * Retrieve the logged-in student's interests (Student only).
   * Endpoint: GET /api/auth/me/interests/ → { interests: [{ id, name }] }
   */
  getMine: () => api.get("/api/auth/me/interests/"),

  /**
   * Replace the logged-in student's interests (Student only). [] clears them.
   * Endpoint: PUT /api/auth/me/interests/
   * @param {string[]} interestIds - Interest UUIDs
   */
  setMine: (interestIds) => api.put("/api/auth/me/interests/", { interests: interestIds }),
};

/**
 * Content Reports API Service — Week 7 Backend Integration
 * Report an inappropriate club or event; view own reports and their status.
 */
export const reportsAPI = {
  /**
   * Submit a report (any logged-in user).
   * Endpoint: POST /api/reports/
   * 400 for own club/event, drafts or validation errors; 409 if already reported.
   * @param {Object} payload - { target_type: "club"|"event", target: slug|eventId,
   *   reason: "inappropriate"|"spam"|"misleading"|"harassment"|"other", details?: string }
   */
  create: (payload) => api.post("/api/reports/", payload),

  /**
   * List the user's own reports, newest first (paginated).
   * Endpoint: GET /api/reports/
   * @param {Object} [params] - { page, page_size }
   */
  getMine: (params) => api.get("/api/reports/", { params }),
};

/**
 * Dashboard API Service — Week 7 Backend Integration
 * Each dashboard is returned in a single call.
 */
export const dashboardAPI = {
  /**
   * Student dashboard (Student only).
   * Endpoint: GET /api/dashboard/student/
   * → { has_interests, counts, next_events, rating_prompts, suggested_clubs }
   */
  student: () => api.get("/api/dashboard/student/"),

  /**
   * Club operator dashboard (Club Operator only).
   * Endpoint: GET /api/dashboard/club/
   * → { club, counts, ratings, next_events, recent_events, registrations_last_7_days }
   */
  club: () => api.get("/api/dashboard/club/"),
};

/**
 * Analytics API Service — Week 8 Backend Integration (five analytical reports)
 * Percentages are numbers with one decimal, or null when there is nothing to divide by.
 */
export const analyticsAPI = {
  /**
   * Report 1 — Department-wise participation for one event (owning operator).
   * Endpoint: GET /api/analytics/events/:id/department-participation/
   * 409 unless the event is published and has ended.
   * @param {string} eventId - Event UUID
   */
  departmentParticipation: (eventId) =>
    api.get(`/api/analytics/events/${eventId}/department-participation/`),

  /**
   * Report 2 — Post-event rating for one event (owning operator).
   * Endpoint: GET /api/analytics/events/:id/ratings/
   * 409 unless the event is published. `distribution` always has five rows (1–5).
   * @param {string} eventId - Event UUID
   */
  postEventRatings: (eventId) => api.get(`/api/analytics/events/${eventId}/ratings/`),

  /**
   * Report 3 — Club vs club (any club operator).
   * Endpoint: GET /api/analytics/club-comparison/
   * @param {Object} [params] - { date_from, date_to } as YYYY-MM-DD (filter on event start date)
   */
  clubComparison: (params) => api.get("/api/analytics/club-comparison/", { params: cleanPeriod(params) }),

  /**
   * Report 4 — The logged-in student's own activity (student only).
   * Endpoint: GET /api/analytics/student-activity/
   */
  studentActivity: () => api.get("/api/analytics/student-activity/"),

  /**
   * Report 5 — The operator's own club report (club operator).
   * Endpoint: GET /api/analytics/my-club/
   * @param {Object} [params] - { date_from, date_to } as YYYY-MM-DD (filter on event start date)
   */
  myClub: (params) => api.get("/api/analytics/my-club/", { params: cleanPeriod(params) }),
};

// Drop empty date filters so the backend treats them as "no filter"
function cleanPeriod(params = {}) {
  const out = {};
  if (params?.date_from) out.date_from = params.date_from;
  if (params?.date_to) out.date_to = params.date_to;
  return out;
}

/**
 * Report reason options and status labels shared by report UI components.
 */
export const REPORT_REASONS = [
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "misleading", label: "Misleading information" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

export const REPORT_STATUS_LABELS = {
  open: "Received",
  under_review: "Under review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export default api;
