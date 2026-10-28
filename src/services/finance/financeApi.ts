import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const rawBaseUrl = import.meta.env.VITE_FINANCE_API_URL || 'http://localhost:3014';
const baseURL = rawBaseUrl.endsWith('/api/v1/finance')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1/finance`;

export const financeApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

financeApi.interceptors.request.use((config) => {
  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader?.Authorization) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});

financeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'Erro na API Financeira';
    console.error('Finance API Error:', message, { status: error?.response?.status });
    return Promise.reject(error);
  }
);

export default financeApi;
