import axios, { type AxiosInstance } from 'axios';
import { getToken, redirectToLogin } from '../utils/authStorage';

// Helper to create axios instance for a specific service
export const createServiceClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request interceptor - Add token to headers
  client.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - Handle errors
  client.interceptors.response.use(
    (response) => {
      // Nếu response type là blob (download file), giữ nguyên response
      if (response.config.responseType === 'blob') {
        return response;
      }
      // Các response khác unwrap data như bình thường
      return response.data;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Check if this request should skip auto-logout
        const skipAutoLogout = error.config?.skipAutoLogout;
        if (!skipAutoLogout) {
          redirectToLogin();
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};
