import { Utensils } from 'lucide-react';

/** Full-page loading state, used while the session is being resolved. */
const Loading = () => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-neutral-50"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary-600 mb-5 animate-shimmer">
        <Utensils className="h-7 w-7 text-white" aria-hidden />
      </div>
      <p className="font-display text-lg font-semibold text-neutral-800 mb-4">Pantry Chef</p>
      <div className="w-48 h-1 bg-neutral-200 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-primary-500 rounded-full animate-loading" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
};

export default Loading;
