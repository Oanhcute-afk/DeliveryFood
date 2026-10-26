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
    // Dùng console.warn thay vì console.error để không kích hoạt màn hình báo lỗi đỏ (LogBox) của React Native trên điện thoại
    console.warn(
      '[API] Request warning:',
      error.response?.status ?? error.code,
      error.config?.url,
      error.message,
    );
    return Promise.reject(error);
  },
);
