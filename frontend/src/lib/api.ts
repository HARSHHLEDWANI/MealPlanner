import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';
import type { ApiErrorBody } from '@/types';

/**
 * The single HTTP client for the API.
 *
 * There were previously two patterns: this axios instance, and raw
 * `fetch('/api/...')` calls in useAI.ts that assumed a dev-server proxy which
 * was never configured — those requests hit the Vite server and 404'd. Every
 * call now goes through here.
 */

// The default matches the backend's own default port. It previously pointed at
// 5000 while the server listened on 5001, so omitting the env var sent every
// request into a closed port.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * A failed API call, normalized.
 *
 * The backend's error handler returns a consistent
 * `{ error: { code, message, details } }` envelope; this surfaces it so
 * callers can branch on `code` and show `message` directly instead of digging
 * through the axios error shape.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the caller has exhausted a rate limit or usage quota. */
  get isLimited() {
    return this.status === 429 || this.code === 'QUOTA_EXCEEDED';
  }
}

/**
 * Attaches the Supabase access token to every request.
 *
 * The backend verifies this on all /api routes. `getSession()` refreshes an
 * expired token transparently, so this stays valid across long sessions.
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      // No response at all — the API is unreachable, not returning an error.
      return Promise.reject(
        new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.')
      );
    }

    const { status, data } = error.response;
    const body = data?.error;

    // An expired or revoked session: clear it so the app returns to sign-in
    // rather than looping on requests that will keep failing.
    if (status === 401) {
      await supabase.auth.signOut().catch(() => undefined);
    }

    return Promise.reject(
      new ApiError(
        status,
        body?.code ?? 'UNKNOWN',
        body?.message ?? 'Something went wrong. Please try again.',
        body?.details
      )
    );
  }
);

/** Extracts a displayable message from anything thrown by an API call. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default api;
