import axios from "axios";

const API_BASE_URL =
  (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL ||
  "/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

export default apiClient;
export { API_BASE_URL };
