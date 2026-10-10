import axios from 'axios';
import type { SportDataAccountType } from './sportdata-account-types';

const TOKEN_KEY = 'participant_token';
const ACCOUNT_KEY = 'participant_account';

export const participantApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BROWSER_API_URL || '/api',
});

participantApi.interceptors.request.use((config) => {
  const token = getParticipantToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

participantApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearParticipantSession();
    return Promise.reject(error);
  },
);

export function getParticipantToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

export type SportDataAccount = {
  id: string;
  email: string;
  displayName: string;
  accountType?: SportDataAccountType;
  accountTypes?: SportDataAccountType[];
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  federationId?: string | null;
};

export function getParticipantAccount(): SportDataAccount | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(ACCOUNT_KEY);
  if (!value) return null;
  try {
    const account = JSON.parse(value);
    // Normalize sessions saved before the unified account migration.
    if (account.accountType === 'FEDERATION') account.accountType = 'TEAM_LEADER';
    account.accountType ||= account.accountTypes?.[0] || 'ATHLETE';
    account.accountTypes = [account.accountType];
    return account;
  } catch { return null; }
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
