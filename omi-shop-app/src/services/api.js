import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE = "http://187.77.12.9:9000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export const formatApiError = (err) => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  const dataText =
    err?.response?.data && typeof err.response.data !== "string"
      ? JSON.stringify(err.response.data)
      : err?.response?.data;
  const code = err?.code;
  const message = err?.message;
  const method = err?.config?.method?.toUpperCase?.() || "REQUEST";
  const url = err?.config?.baseURL
    ? `${err.config.baseURL}${err?.config?.url || ""}`
    : err?.config?.url || API_BASE;

  if (status || detail) {
    return `${method} ${url}\nHTTP ${status || "?"}\n${detail || dataText || "Request failed"}`;
  }

  if (code === "ECONNABORTED") {
    return `${method} ${url}\nNetwork timeout after 15s`;
  }

  if (message && message.toLowerCase().includes("network error")) {
    return `${method} ${url}\nNetwork Error (check Android cleartext policy, VPS firewall, and server reachability)`;
  }

  return `${method} ${url}\n${message || "Could not connect to server"}`;
};

// Attach JWT to every request if we have one
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("jwt");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    // Do not block requests if secure storage is temporarily unavailable.
    console.warn("SecureStore read failed while building auth header", err);
  }
  return config;
});

// Auth
export const login = (username, password) =>
  api.post("/auth/login", { username, password });

// Photos
export const getPhotos = (page = 1, limit = 20, date = null) => {
  const params = { page, limit };
  if (date) params.date = date;
  return api.get("/photos/", { params });
};

export const getPhotoFile = (id) => `${API_BASE}/photos/${id}/file`;
export const getThumbUrl = (id) => `${API_BASE}/photos/${id}/thumb`;

export const deletePhoto = (id) => api.delete(`/photos/${id}`);

// Videos
export const getVideos = (page = 1, limit = 20) =>
  api.get("/videos/", { params: { page, limit } });

export const getVideoFileUrl = (id) => `${API_BASE}/videos/${id}/file`;

export const deleteVideo = (id) => api.delete(`/videos/${id}`);

// Events
export const getEvents = () => api.get("/events/");

// Health
export const getHealth = () => api.get("/health");

// Helper to get auth header for image/video requests
export const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync("jwt");
  return { Authorization: `Bearer ${token}` };
};

export default api;
