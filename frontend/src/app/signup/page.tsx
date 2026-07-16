'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { provisionAccount } from '@/lib/api';
import { Logo } from '@/components/Logo';

const INDUSTRIES = [
  'E-commerce', 'SaaS', 'Healthcare', 'Finance', 'Education',
  'Real Estate', 'Travel', 'Legal', 'Customer Support', 'Other',
];

const PENDING_PROFILE_KEY = 'tryda_pending_signup_profile';

function friendlyError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  console.error('Auth error:', err);
  return `Something went wrong${code ? ` (${code})` : ''}. Please try again.`;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [aiToolDescription, setAiToolDescription] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [resumingRedirect, setResumingRedirect] = useState(true);

  const profileComplete = name.trim() && industry && aiToolDescription.trim();

  // Completes the flow after Google redirects back here (signInWithRedirect
  // navigates the whole page away and back — form state doesn't survive that,
  // so the business profile fields were stashed in sessionStorage first).
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return;
        const stored = sessionStorage.getItem(PENDING_PROFILE_KEY);
        if (!stored) {
          setError('Your business details were lost — please fill in the form and try again.');
          return;
        }
        sessionStorage.removeItem(PENDING_PROFILE_KEY);
        await provisionAccount(JSON.parse(stored));
        router.push('/dashboard');
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setResumingRedirect(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishSignup() {
    await provisionAccount({ name: name.trim(), industry, aiToolDescription: aiToolDescription.trim() });
    router.push('/dashboard');
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!profileComplete) {
      setError('Please fill in your business details first.');
      return;
    }
    setError(null);
    setLoading('email');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await finishSignup();
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(null);
    }
  }

  async function handleGoogleSignup() {
    if (!profileComplete) {
      setError('Please fill in your business details first, then continue with Google.');
      return;
    }
    setError(null);
    sessionStorage.setItem(
      PENDING_PROFILE_KEY,
      JSON.stringify({ name: name.trim(), industry, aiToolDescription: aiToolDescription.trim() })
    );
    await signInWithRedirect(auth, googleProvider);
  }

  if (resumingRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Signing in...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size={48} />
          <h1 className="text-xl font-semibold text-gray-100 mt-4">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start monitoring your AI's reliability in minutes</p>
        </div>

        <form onSubmit={handleEmailSignup} className="card space-y-4">
          {error && (
            <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg px-3 py-2 text-xs text-status-critical">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <p className="section-label !mb-1">Your Business</p>
            <input
              className="input" placeholder="Business name" value={name}
              onChange={(e) => setName(e.target.value)} required
            />
            <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} required>
              <option value="" disabled>Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <input
              className="input" placeholder="What AI tool are you running? (e.g. GPT-4 support widget)"
              value={aiToolDescription} onChange={(e) => setAiToolDescription(e.target.value)} required
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-surface-border">
            <p className="section-label !mb-1 !mt-3">Account</p>
            <input
              className="input" type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
            />
            <input
              className="input" type="password" placeholder="Password (min 6 characters)" value={password}
              onChange={(e) => setPassword(e.target.value)} minLength={6} required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading !== null}>
            {loading === 'email' ? 'Creating account...' : 'Create account'}
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex-1 h-px bg-surface-border" />
            or
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <button
            type="button" onClick={handleGoogleSignup} disabled={loading !== null}
            className="btn-ghost w-full border border-surface-border flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/signin" className="text-teal hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 36.1 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 40.6 16.3 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.3 45 30.7 45 24c0-1.4-.1-2.7-.4-3.5z"/>
    </svg>
  );
}