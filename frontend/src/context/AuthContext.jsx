import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logout helper
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Listen to logout events triggered by api interceptors on refresh failure
  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
    };
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, [logout]);

  // Initial user fetch if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("access_token");
      const refresh = localStorage.getItem("refresh_token");

      if (!token && !refresh) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/api/auth/me/");
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        // Token is invalid/expired and refresh failed in interceptor
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [logout]);

  // Login method: accepts identifier (email or student_id) and password
  const login = async (identifier, password) => {
    const response = await api.post("/api/auth/login/", {
      identifier: identifier.trim(),
      password,
    });

    const { access, refresh, user: userData } = response.data;

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    if (userData) {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    }

    // Fallback if user object was omitted in login response
    const meResponse = await api.get("/api/auth/me/");
    setUser(meResponse.data);
    localStorage.setItem("user", JSON.stringify(meResponse.data));
    return meResponse.data;
  };

  // Register student method
  const register = async (studentData) => {
    const response = await api.post("/api/auth/register/student/", studentData);
    return response.data;
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
