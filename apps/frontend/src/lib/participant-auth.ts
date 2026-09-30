import axios from 'axios';

const TOKEN_KEY = 'participant_token';
const ACCOUNT_KEY = 'participant_account';

export const participantApi = axios.create({ baseURL: '/api' });

participantApi.interceptors.request.use((config) => {
  const token = getParticipantToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getParticipantToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

export function getParticipantAccount(): { id: string; email: string; displayName: string } | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(ACCOUNT_KEY);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export function setParticipantSession(token: string, account: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  window.dispatchEvent(new Event('participant-session-change'));
}

export function clearParticipantSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
  window.dispatchEvent(new Event('participant-session-change'));
}

export function participantError(error: any, fallback = 'Không thể thực hiện yêu cầu') {
  const message = error?.response?.data?.message || error?.message || fallback;
  return Array.isArray(message) ? message.join(', ') : String(message);
}
