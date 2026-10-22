
import axios from 'axios';
import { getToken } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

console.log('[API] Base URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  console.log('[API] Request:', config.method?.toUpperCase(), config.baseURL, config.url);

  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API] Error message:', error.message);
    console.error('[API] Error code:', error.code);
    console.error('[API] Response status:', error.response?.status);
    console.error('[API] Request URL:', error.config?.baseURL, error.config?.url);
    return Promise.reject(error);
  },
);
