'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, firebaseApp } from '@/lib/firebase';
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

function isStrongPassword(p: string): boolean {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,./?';
  
  let p = '';
  p += upper[Math.floor(Math.random() * upper.length)];
  p += lower[Math.floor(Math.random() * lower.length)];
  p += numbers[Math.floor(Math.random() * numbers.length)];
  p += special[Math.floor(Math.random() * special.length)];
  
  const all = upper + lower + numbers + special;
  for (let i = 0; i < 8; i++) {
    p += all[Math.floor(Math.random() * all.length)];
  }
  
  return p.split('').sort(() => Math.random() - 0.5).join('');
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [aiToolDescription, setAiToolDescription] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const auditId = searchParams.get('id');
    if (!auditId) return;

    const db = getFirestore(firebaseApp);
    getDoc(doc(db, 'leads', auditId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.companyName) setName(data.companyName);
          if (data.contactEmail) setEmail(data.contactEmail);
          
          const matchedIndustry = INDUSTRIES.find(
            ind => ind.toLowerCase() === (data.industry || '').toLowerCase()
          );
          setIndustry(matchedIndustry || 'Other');
          
          if (data.websiteUrl) {
            setAiToolDescription(`AI support chatbot on website: ${data.websiteUrl}`);
          } else {
            setAiToolDescription('AI customer support assistant');
          }
        }
      })
      .catch((err) => {
        console.error('Error prefilling lead details:', err);
      });
  }, []);

  const profileComplete = Boolean(name.trim() && industry && aiToolDescription.trim());

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!profileComplete) {
      setError('Please fill in your business details first.');
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password is too weak. It must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character (e.g. !, @, #, $, etc.).');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setLoading('email');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send Firebase official verification link to their email
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
      }
      
      await provisionAccount({ name: name.trim(), industry, aiToolDescription: aiToolDescription.trim() });
      setSuccessMessage('Account created successfully! We sent a verification link to your email.');
      
      setTimeout(() => {
        router.push('/dashboard?verify=1');
      }, 3000);
    } catch (err: any) {
      setError(friendlyError(err));
      setLoading(null);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    setSuccessMessage(null);
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
        // New Google account, no business yet — collect the missing details
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
          <Link href="/">
            <img
              src="/brand/mascot/tryda-mascot-dashboard.png"
              alt="Tryda mascot"
              className="w-64 mx-auto rounded-2xl border border-surface-border shadow-card animate-fade-in -scale-x-100"
            />
          </Link>
          <p className="text-lg font-semibold text-gray-100 mt-6">Your AI's reliability co-pilot</p>
          <p className="text-sm text-gray-500 mt-2">
            Tryda catches quality drift before your customers ever notice — set up monitoring in minutes.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/"><Logo size={48} /></Link>
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
            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-400">
                {successMessage}
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
              <p className="section-label !mb-1 !mt-2">Account Details</p>
              
              <input
                className="input w-full" type="email" placeholder="email@business.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required
              />
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-gray-500 font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const strong = generateStrongPassword();
                      setPassword(strong);
                      navigator.clipboard.writeText(strong)
                        .then(() => {
                          setSuccessMessage('A highly secure password has been generated and copied to your clipboard!');
                          setTimeout(() => setSuccessMessage(null), 5000);
                        })
                        .catch(() => {
                          setSuccessMessage(`Suggested: ${strong} (Please copy and save it!)`);
                        });
                    }}
                    className="text-teal hover:underline text-[10px] font-medium"
                  >
                    Suggest strong password
                  </button>
                </div>
                <input
                  className="input w-full" type="password" placeholder="Password (min 8 characters)" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                />
                <p className="text-[10px] text-gray-500 leading-normal">
                  Must be at least 8 characters and include an uppercase letter, a number, and a symbol.
                </p>
              </div>
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
