import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button, Card, ErrorBanner, Input } from '@/components/ui';

/**
 * Passwordless sign-in.
 *
 * This screen used to offer an Email/Phone toggle, but the auth store only
 * implements email OTP — choosing Phone passed the number to Supabase as the
 * `email` field and failed with a confusing validation error. Only email is
 * offered now, because only email works.
 *
 * The page renders the form alone; AuthLayout supplies the branding, the
 * centering, and the full-height frame this component used to duplicate.
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { signIn } = useAuthStore();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const { success, error } = await signIn(email.trim());
      if (success) {
        setSent(true);
      } else {
        setFormError(error ?? 'We could not send the link. Please try again.');
      }
    } catch {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary-100 mb-4">
          <Mail className="h-6 w-6 text-secondary-700" aria-hidden />
        </div>
        <h2 className="font-display text-xl font-semibold text-neutral-900 mb-2">
          Check your inbox
        </h2>
        <p className="text-neutral-600 mb-6">
          We sent a sign-in link to <span className="font-medium text-neutral-900">{email}</span>.
          It expires shortly, so use it soon.
        </p>
        <Button
          variant="outline"
          fullWidth
          onClick={() => {
            setSent(false);
            setFormError(null);
          }}
        >
          Use a different email
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h2 className="font-display text-2xl font-semibold text-neutral-900 mb-1">Welcome back</h2>
      <p className="text-neutral-600 mb-6">
        Enter your email and we will send you a link to sign in. No password needed.
      </p>

      {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={submitting}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!email.trim()}>
          {!submitting && <Mail size={16} aria-hidden />}
          Send sign-in link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        By continuing you agree to our{' '}
        <a href="#" className="text-primary-700 hover:underline font-medium">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="text-primary-700 hover:underline font-medium">
          Privacy Policy
        </a>
        .
      </p>
    </Card>
  );
};

export default Login;
