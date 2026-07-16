'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { provisionAccount } from '@/lib/api';
import { Logo } from '@/components/Logo';

const INDUSTRIES = [
  'E-commerce', 'SaaS', 'Healthcare', 'Finance', 'Education',
  'Real Estate', 'Travel', 'Legal', 'Customer Support', 'Other',
];

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
  // Set once a Google sign-in has succeeded but the account has no business
  // record yet — we still need the profile fields, just after auth instead
  // of gating the "Continue with Google" button behind them.
  const [needsProfile, setNeedsProfile] = useState(false);

  const profileComplete = Boolean(name.trim() && industry && aiToolDescription.trim());

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
      await provisionAccount({ name: name.trim(), industry, aiToolDescription: aiToolDescription.trim() });
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(null);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    setLoading('google');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(null);
      return;
    }
    try {
      await provisionAccount({ name: name.trim(), industry, aiToolDescription: aiToolDescription.trim() });
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.status === 400) {
        // New Google account, no business yet — collect the missing
        // details now instead of before auth.
        setNeedsProfile(true);
        setLoading(null);
      } else {
        setError(friendlyError(err));
        setLoading(null);
      }
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileComplete) {
      setError('Please fill in your business details.');
      return;
    }
    setError(null);
    setLoading('google');
    try {
      await provisionAccount({ name: name.trim(), industry, aiToolDescription: aiToolDescription.trim() });
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-navy-800/40 border-r border-surface-border p-12">
        <div className="absolute w-96 h-96 bg-teal/10 rounded-full blur-[100px]" />
        <div className="relative text-center max-w-sm">
          <img
            src="/brand/mascot/tryda-mascot-dashboard.png"
            alt="Tryda mascot"
            className="w-64 mx-auto rounded-2xl border border-surface-border shadow-card animate-fade-in -scale-x-100"
          />
          <p className="text-lg font-semibold text-gray-100 mt-6">Your AI's reliability co-pilot</p>
          <p className="text-sm text-gray-500 mt-2">
            Tryda catches quality drift before your customers ever notice — set up monitoring in minutes.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size={48} />
          <h1 className="text-xl font-semibold text-gray-100 mt-4">
            {needsProfile ? 'One more step' : 'Create your account'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {needsProfile
              ? `Signed in as ${auth.currentUser?.email} — tell us about your business`
              : "Start monitoring your AI's reliability in minutes"}
          </p>
        </div>

        {needsProfile ? (
          <form onSubmit={handleCompleteProfile} className="card space-y-4">
            {error && (
              <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg px-3 py-2 text-xs text-status-critical">
                {error}
              </div>
            )}

            <div className="space-y-3">
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

            <button type="submit" className="btn-primary w-full" disabled={loading !== null}>
              {loading === 'google' ? 'Finishing up...' : 'Finish setting up'}
            </button>

            <button
              type="button"
              onClick={() => auth.signOut().then(() => setNeedsProfile(false))}
              className="text-xs text-gray-500 hover:text-gray-300 w-full text-center"
            >
              Not you? Sign out
            </button>
          </form>
        ) : (
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
              {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
            </button>
          </form>
        )}

        {!needsProfile && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/signin" className="text-teal hover:underline">Sign in</Link>
          </p>
        )}
      </div>
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
