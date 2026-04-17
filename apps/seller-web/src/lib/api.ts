import axios from "axios";

const API_BASE_URL =
  (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL ||
  "http://172.20.10.3:5022/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("userId");
    if (token) {
      config.params = { ...config.params, ownerId: token };
    }
  }
  return config;
});

export default apiClient;
