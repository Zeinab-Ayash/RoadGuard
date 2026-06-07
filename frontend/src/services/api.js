import axios from 'axios';

// Backend API base URL.
// - Web / iOS Simulator:  http://localhost:3000
// - Android Emulator:     http://10.0.2.2:3000
// - Phone via Expo Go:    http://YOUR_LAPTOP_LAN_IP:3000  (e.g. http://192.168.10.177:3000)
export const API_BASE_URL = 'http://192.168.10.177:3000';

// AI server WebSocket base URL (Phase 5 server). The phone connects to
// /events/{session_id} on this host to receive behavior alarms.
// - Local laptop testing:    ws://<your-laptop-LAN-IP>:8000
// - Hugging Face Spaces:     wss://<user>-<space-name>.hf.space
//                            (note: wss:// because HF serves over HTTPS)
export const AI_SERVER_WS_BASE = 'ws://192.168.10.177:8000';

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
