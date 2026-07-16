'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { provisionAccount } from '@/lib/api';
import { Logo } from '@/components/Logo';

function friendlyError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'no-account') return 'No account found for this Google login. Please sign up first.';
  console.error('Auth error:', err);
  return `Something went wrong${code ? ` (${code})` : ''}. Please try again.`;
}

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);

  async function handleEmailSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading('email');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await provisionAccount();
      router.push('/dashboard');
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(null);
    }
  }

  async function handleGoogleSignin() {
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
      const { created } = await provisionAccount();
      if (created) {
        await auth.signOut();
        setError(friendlyError({ code: 'no-account' }));
        setLoading(null);
        return;
      }
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
          <Link href="/">
            <img
              src="/brand/mascot/tryda-mascot-standing.png"
              alt="Tryda mascot"
              className="w-64 mx-auto rounded-2xl border border-surface-border shadow-card animate-fade-in"
            />
          </Link>
          <p className="text-lg font-semibold text-gray-100 mt-6">Good to see you again</p>
          <p className="text-sm text-gray-500 mt-2">
            Pick up right where you left off — your AI's quality report is waiting.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link href="/"><Logo size={48} /></Link>
          <h1 className="text-xl font-semibold text-gray-100 mt-4">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your Tryda dashboard</p>
        </div>

        <form onSubmit={handleEmailSignin} className="card space-y-4">
          {error && (
            <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg px-3 py-2 text-xs text-status-critical">
              {error}
            </div>
          )}

          <input
            className="input" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            className="input" type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
          />

          <button type="submit" className="btn-primary w-full" disabled={loading !== null}>
            {loading === 'email' ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex-1 h-px bg-surface-border" />
            or
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <button
            type="button" onClick={handleGoogleSignin} disabled={loading !== null}
            className="btn-ghost w-full border border-surface-border flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-teal hover:underline">Create one</Link>
        </p>
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