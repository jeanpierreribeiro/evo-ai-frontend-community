import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import apiAuth from '@/services/core/apiAuth';

const configuredUrl = import.meta.env.VITE_LOANS_API_URL as string | undefined;
const rawBaseUrl = configuredUrl && !configuredUrl.startsWith('VITE_LOANS_')
  ? configuredUrl : window.location.origin;
const baseURL = rawBaseUrl.endsWith('/api/v1/loans')
  ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1/loans`;

export const loansApi = axios.create({ baseURL });
loansApi.interceptors.request.use(config => {
  const auth = useAuthStore.getState().getAuthHeader();
  if (auth?.Authorization) config.headers.Authorization = auth.Authorization;
  return config;
});

let refreshPromise: Promise<string> | null = null;
loansApi.interceptors.response.use(undefined, async error => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  if (error.response?.status !== 401 || !original || original._retry) return Promise.reject(error);
  original._retry = true;
  if (!refreshPromise) {
    refreshPromise = apiAuth.post('/auth/refresh').then(response => {
      const data = response.data?.data || response.data;
      const token = data?.access_token || data?.token?.access_token;
      if (typeof token !== 'string' || !token) throw new Error('Token de renovação ausente');
      useAuthStore.getState().setAccessToken(token);
      return token;
    }).finally(() => { refreshPromise = null; });
  }
  try {
    original.headers.Authorization = `Bearer ${await refreshPromise}`;
    // A configuração original conserva Idempotency-Key e demais cabeçalhos.
    return loansApi(original);
  } catch (refreshError) {
    window.dispatchEvent(new CustomEvent('evolution:auth-lost'));
    return Promise.reject(refreshError);
  }
});

export default loansApi;
