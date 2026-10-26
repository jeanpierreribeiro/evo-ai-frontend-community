import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

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

projectsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Erro na API de Projetos';
    console.error('Projects API Error:', message, { status: error?.response?.status });
    return Promise.reject(error);
  }
);

export default projectsApi;
