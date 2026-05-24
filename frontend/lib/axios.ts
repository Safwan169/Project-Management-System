import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import type { ApiError } from '@/types';

export const AUTH_TOKEN_KEY = 'pms.token';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let lastRateLimitToastAt = 0;

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      // Skip the redirect if already on /login to avoid a loop.
      if (!window.location.pathname.startsWith('/login')) {
        toast.error('Your session expired. Please sign in again.');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    const message =
      error.response?.data?.message ?? error.message ?? 'Something went wrong. Please try again.';

    // Avoid stacking identical rate-limit toasts from parallel requests.
    if (status === 429) {
      const now = Date.now();
      if (now - lastRateLimitToastAt > 4000) {
        lastRateLimitToastAt = now;
        toast.error(message);
      }
      return Promise.reject(error);
    }

    toast.error(message);

    return Promise.reject(error);
  },
);

export default api;
