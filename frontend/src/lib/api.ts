import axios from "axios";
import { normalizeApiError, NormalizedApiError } from "./errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15-second timeout for reliable network error handling
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

// Prevent simultaneous 401 cascades from multiple failing concurrent requests
let isHandlingUnauthorized = false;

// Add a response interceptor to handle token expiration/unauthorized errors and normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeApiError(error);

    // Attach normalized error directly to the error instance for easy downstream consumption
    (error as any).normalized = normalized;

    // Handle authentication expiration on 401
    if (normalized.isUnauthorized && typeof window !== "undefined") {
      const hasToken = !!localStorage.getItem("token");
      // Only clear and dispatch logout if a user token was actually present
      if (hasToken && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth_logout"));
        setTimeout(() => {
          isHandlingUnauthorized = false;
        }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
