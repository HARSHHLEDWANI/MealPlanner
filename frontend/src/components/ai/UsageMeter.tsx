import { useEffect } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { useUsageStore } from '@/store/usageStore';
import { cn } from '@/lib/cn';

/**
 * Shows how much of today's AI allowance is left.
 *
 * Sits next to every generate control so the limit is visible before it is
 * hit, rather than only appearing as an error after a click fails.
 */
export function UsageMeter({ className }: { className?: string }) {
  const { usage, exhausted, fetchUsage } = useUsageStore();

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (!usage || usage.quota === 0) return null;

  const pct = Math.min(100, Math.round((usage.used / usage.quota) * 100));
  const low = usage.remaining <= Math.max(2, usage.quota * 0.1);

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {exhausted ? (
        <AlertTriangle size={14} className="text-amber-600 shrink-0" aria-hidden />
      ) : (
        <Sparkles size={14} className="text-primary-500 shrink-0" aria-hidden />
      )}

      <div
        className="h-1.5 w-24 rounded-full bg-neutral-200 overflow-hidden"
        role="progressbar"
        aria-valuenow={usage.used}
        aria-valuemin={0}
        aria-valuemax={usage.quota}
        aria-label="AI generations used today"
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            exhausted ? 'bg-amber-500' : low ? 'bg-amber-400' : 'bg-primary-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className={cn('text-xs', low || exhausted ? 'text-amber-700' : 'text-neutral-500')}>
        {exhausted
          ? 'Daily AI limit reached'
          : `${usage.remaining} of ${usage.quota} AI generations left today`}
      </span>
    </div>
  );
}

/**
 * Full replacement for a generate control once the quota is gone.
 *
 * Deliberately distinct from a generic error: this is not a failure the user
 * should retry, and saying when it resets prevents them from trying anyway.
 */
export function QuotaExhausted({ className }: { className?: string }) {
  const { usage } = useUsageStore();

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200',
        className
      )}
      role="status"
    >
      <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="font-medium text-amber-900">You have used today's AI generations</p>
        <p className="text-sm text-amber-800 mt-0.5">
          {usage?.quota
            ? `All ${usage.quota} generations are spent. Your allowance resets tomorrow.`
            : 'Your allowance resets tomorrow.'}{' '}
          Searching the recipe library still works and does not count against it.
        </p>
      </div>
    </div>
  );
}
