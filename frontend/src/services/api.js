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

export default api;
