import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const rawBaseUrl = import.meta.env.VITE_SCHEDULING_API_URL || 'http://localhost:3012';
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
