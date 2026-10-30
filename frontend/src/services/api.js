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

export default api;
