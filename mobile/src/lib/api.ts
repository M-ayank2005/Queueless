import axios from "axios";

// Base API URL with environment variable support (fallback to local server)
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

// In-memory token cache to avoid asynchronous storage reads on every HTTP request
let authToken: string | null = null;

// Centralized Axios instance with default headers
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Updates the in-memory token whenever AuthContext logs in or restores a session
export function setApiToken(token: string | null): void {
  authToken = token;
}

// Global 401 unauthorized session handler callback
let isHandlingUnauthorized = false;
let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedHandler(callback: () => void): () => void {
  onUnauthorizedCallback = callback;
  return () => {
    if (onUnauthorizedCallback === callback) {
      onUnauthorizedCallback = null;
    }
  };
}

// Request Interceptor: Automatically attaches the Bearer JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catches 401 Unauthorized responses and invokes session invalidation handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        setApiToken(null);
        if (onUnauthorizedCallback) {
          try {
            onUnauthorizedCallback();
          } catch {}
        }
        // Debounce to prevent simultaneous multi-request 401 logout cascades
        setTimeout(() => {
          isHandlingUnauthorized = false;
        }, 1500);
      }
    }
    return Promise.reject(error);
  }
);
