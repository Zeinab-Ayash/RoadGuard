import axios from 'axios';

// Backend API base URL.
// - Web / iOS Simulator:  http://localhost:3000
// - Android Emulator:     http://10.0.2.2:3000
// - Phone via Expo Go:    http://YOUR_LAPTOP_LAN_IP:3000  (e.g. http://192.168.10.177:3000)
export const API_BASE_URL = 'http://localhost:3000';

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
