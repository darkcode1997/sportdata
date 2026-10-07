import axios from 'axios';

const TOKEN_KEY = 'cms_token';
const USER_KEY = 'cms_user';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BROWSER_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.replace('/cms/login');
      }
    }
    return Promise.reject(error);
  }
);

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string, user?: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export async function fetcher<T = any>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}

export async function poster<T = any>(url: string, data: any): Promise<T> {
  const response = await api.post<T>(url, data);
  return response.data;
}

export async function putter<T = any>(url: string, data: any): Promise<T> {
  const response = await api.put<T>(url, data);
  return response.data;
}

export async function deleter<T = any>(url: string): Promise<T> {
  const response = await api.delete<T>(url);
  return response.data;
}
