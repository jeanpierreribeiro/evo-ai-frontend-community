import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const getSchedulingBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SCHEDULING_API_URL;
  if (envUrl && envUrl !== 'VITE_SCHEDULING_API_URL_PLACEHOLDER') {
    return envUrl;
  }
  // Em produção ou acesso seguro via HTTPS, evita localhost:3012 prevenindo Mixed Content / Network Error
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const apiBase = import.meta.env.VITE_API_URL;
    if (apiBase && apiBase !== 'VITE_API_URL_PLACEHOLDER') {
      return apiBase;
    }
    return window.location.origin;
  }
  return 'http://localhost:3012';
};

const rawBaseUrl = getSchedulingBaseUrl();
const baseURL = rawBaseUrl.endsWith('/api/v1/scheduling')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1/scheduling`;

export const schedulingApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

schedulingApi.interceptors.request.use((config) => {
  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader?.Authorization) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});

schedulingApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Erro na API de Agendamento';
    console.error('Scheduling API Error:', message, { status: error?.response?.status });
    return Promise.reject(error);
  }
);

export default schedulingApi;
