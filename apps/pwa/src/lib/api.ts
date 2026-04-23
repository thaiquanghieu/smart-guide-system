import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

export function assetUrl(url?: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  if (!origin || origin === API_BASE_URL) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

export default apiClient;
export { API_BASE_URL };
