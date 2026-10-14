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

