import axios from 'axios';

// URLs are read from Expo public env vars (loaded automatically from .env / .env.local).
// Fallbacks are the deployed production URLs, so an `eas build` works even if .env is missing.
// For local dev, create frontend/.env.local with your laptop LAN IP (see .env.local.example).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://roadguard-f0x4.onrender.com';

export const AI_SERVER_WS_BASE =
  process.env.EXPO_PUBLIC_AI_SERVER_WS_BASE || 'wss://Zeinab-Ayash-roadguard-ai-server.hf.space';

// Helper to build the events WebSocket URL for a given session id.
export function buildEventsWsUrl(sessionId) {
  return `${AI_SERVER_WS_BASE}/events/${sessionId}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});


let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default api;
