import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button, Card, Spinner } from '@/components/ui';

/**
 * Lands here from the emailed sign-in link.
 *
 * The Supabase client parses the token out of the URL on load
 * (detectSessionInUrl), so the work here is waiting for that to settle, then
 * telling the auth store about it.
 *
 * That last part was missing: this used to call getSession() and navigate to
 * "/" without refreshing the store, so authState was still UNAUTHENTICATED
 * when the redirect evaluated — sending the freshly signed-in user straight
 * back to /login.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const complete = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error || !data.session) {
        // Expired or already-used link. Say so rather than bouncing silently.
        setFailed(true);
        return;
      }

      await checkAuth();
      if (!cancelled) navigate('/dashboard', { replace: true });
    };

    complete();
    return () => {
      cancelled = true;
    };
  }, [navigate, checkAuth]);

  if (failed) {
    return (
      <Card className="p-8 text-center">
        <h2 className="font-display text-xl font-semibold text-neutral-900 mb-2">
          That link did not work
        </h2>
        <p className="text-neutral-600 mb-6">
          Sign-in links expire quickly and can only be used once. Request a fresh one to continue.
        </p>
        <Button fullWidth onClick={() => navigate('/login', { replace: true })}>
          Back to sign in
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-8 text-center">
      <Spinner className="w-8 h-8 mx-auto mb-4" />
      <h2 className="font-display text-lg font-semibold text-neutral-800">Signing you in…</h2>
      <p className="text-neutral-500 mt-1">This will only take a moment.</p>
    </Card>
  );
};

export default AuthCallback;
