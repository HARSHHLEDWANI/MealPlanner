import { create } from 'zustand';
import api from '@/lib/api';
import { ApiError } from '@/lib/api';

/**
 * Daily AI usage.
 *
 * Kept in its own store because several unrelated screens need it — anything
 * with a generate button wants to know whether the button will work before the
 * user presses it.
 */

export interface Usage {
  used: number;
  quota: number;
  remaining: number;
}

interface UsageState {
  usage: Usage | null;
  /** Set when a request came back QUOTA_EXCEEDED, so the UI can explain why. */
  exhausted: boolean;
  fetchUsage: () => Promise<void>;
  /** Records that the API refused a request for quota reasons. */
  markExhausted: (usage?: Partial<Usage>) => void;
  /** Called after a successful generation to keep the counter honest. */
  refresh: () => Promise<void>;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  usage: null,
  exhausted: false,

  fetchUsage: async () => {
    try {
      const { data } = await api.get<Usage & { allowed: boolean }>('/api/ai/usage');
      set({
        usage: { used: data.used, quota: data.quota, remaining: data.remaining },
        exhausted: data.remaining <= 0,
      });
    } catch {
      // Usage display is informational; failing to load it must not break the
      // page it is shown on.
      set({ usage: null });
    }
  },

  markExhausted: (usage) => {
    const current = get().usage;
    set({
      exhausted: true,
      usage: {
        used: usage?.used ?? current?.used ?? 0,
        quota: usage?.quota ?? current?.quota ?? 0,
        remaining: 0,
      },
    });
  },

  refresh: async () => {
    await get().fetchUsage();
  },
}));

/**
 * Turns a failed request into the right quota state.
 *
 * QUOTA_EXCEEDED and a plain rate limit both arrive as 429 but mean different
 * things: one resets tomorrow, the other in minutes. Only the former should
 * put the UI into the exhausted state.
 */
export function handleQuotaError(error: unknown): boolean {
  if (error instanceof ApiError && error.code === 'QUOTA_EXCEEDED') {
    const details = error.details as unknown as { used?: number; quota?: number } | undefined;
    useUsageStore.getState().markExhausted({
      used: details?.used,
      quota: details?.quota,
    });
    return true;
  }
  return false;
}
