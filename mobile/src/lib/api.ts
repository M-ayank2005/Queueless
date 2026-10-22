import axios from "axios";
import { normalizeApiError } from "./errors";

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
  (error) => Promise.reject(normalizeApiError(error))
);

// Response Interceptor: Catches 401 Unauthorized responses and invokes session invalidation handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalized = normalizeApiError(error);
    (error as any).normalized = normalized;

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

// Notifications API
export async function getNotifications(limit: number = 20, cursor?: string) {
  const params: Record<string, any> = { limit };
  if (cursor) params.cursor = cursor;
  const res = await api.get("/queue/notifications", { params });
  return res.data;
}

export async function getUnreadNotificationCount() {
  const res = await api.get("/queue/notifications/unread-count");
  return res.data;
}
export const getUnreadCount = getUnreadNotificationCount;

export async function markNotificationsRead(ids?: string[]) {
  const res = await api.post("/queue/notifications/read", { ids });
  return res.data;
}
export const markRead = markNotificationsRead;

// Updates API
export async function getUpdates(type?: string, limit: number = 20, cursor?: string) {
  const params: Record<string, any> = { limit };
  if (type && type !== "all") params.type = type;
  if (cursor) params.cursor = cursor;
  const res = await api.get("/queue/updates", { params });
  return res.data;
}

export async function createBusinessUpdate(data: {
  type: string;
  title: string;
  message: string;
  validForDays?: number;
}) {
  const res = await api.post("/business/updates", data);
  return res.data;
}

export async function getBusinessUpdates() {
  const res = await api.get("/business/updates");
  return res.data;
}

export async function deleteBusinessUpdate(id: string) {
  const res = await api.delete(`/business/updates/${id}`);
  return res.data;
}

// Push Tokens API
export async function registerPushToken(token: string, platform?: string) {
  const res = await api.post("/auth/push-token", { token, platform });
  return res.data;
}

export async function removePushToken(token?: string) {
  const res = await api.delete("/auth/push-token", { data: { token } });
  return res.data;
}

