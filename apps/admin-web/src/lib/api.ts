import axios from "axios";

const API_BASE_URL =
  (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL ||
  "http://172.20.10.3:5022/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("adminId");
    if (token) {
      config.params = { ...config.params, adminId: token };
    }
  }
  return config;
});

export default apiClient;
