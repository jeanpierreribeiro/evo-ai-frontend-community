import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import apiAuth from '@/services/core/apiAuth';

const rawBaseUrl = import.meta.env.VITE_PROJECTS_API_URL || 'http://localhost:3013';
const baseURL = rawBaseUrl.endsWith('/api/v1/projects')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1/projects`;

export const projectsApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

projectsApi.interceptors.request.use((config) => {
  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader?.Authorization) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

projectsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return projectsApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await apiAuth.post('/auth/refresh');
        const refreshData = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = refreshData?.access_token || refreshData?.token?.access_token;

        if (!newAccessToken) {
          throw new Error('Novo token não recebido no refresh');
        }

        useAuthStore.getState().setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        isRefreshing = false;
        return projectsApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;
        try {
          window.dispatchEvent(new CustomEvent('evolution:auth-lost'));
        } catch {
          // noop
        }
      }
    }

    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Erro na API de Projetos';
    console.error('Projects API Error:', message, { status: error?.response?.status });
    return Promise.reject(error);
  }
);

export default projectsApi;
