import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

let authToken: string | null = null;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setApiToken(token: string | null): void {
  authToken = token;
}

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
