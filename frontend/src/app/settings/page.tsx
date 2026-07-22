'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { fetchBusiness, createCheckoutSession, createPortalSession, verifyCheckoutSession } from '@/lib/api';
import { BusinessProfile, SubscriptionTier } from '@/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useAuth } from '@/lib/auth-context';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free Plan',
  individual: 'Individual Plan',
  enterprise_team: 'Enterprise — Team Plan',
  enterprise_business: 'Enterprise — Business Plan',
};

const UPGRADE_OPTIONS: Array<{
  tier: SubscriptionTier;
  label: string;
  price: { monthly: string; yearly: string };
  blurb: string;
}> = [
  {
    tier: 'individual',
    label: 'Individual',
    price: { monthly: '$15/mo', yearly: '$12/mo' },
    blurb: '1,000 conversations/month · 1 AI tool · CSV & Excel export',
  },
  {
    tier: 'enterprise_team',
    label: 'Enterprise — Team',
    price: { monthly: '$40/mo', yearly: '$32/mo' },
    blurb: '10,000 conversations/month · multiple AI tools · CSV & Excel export',
  },
  {
    tier: 'enterprise_business',
    label: 'Enterprise — Business',
    price: { monthly: '$85/mo', yearly: '$68/mo' },
    blurb: 'Unlimited conversations · dedicated support · CSV & Excel export',
  },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const { user, loading: authLoading } = useRequireAuth();
  const { signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // New Profile States
  const [displayName, setDisplayName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push('/signin');
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setProfileSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName,
      });
      alert('Profile display name updated successfully!');
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    async function load() {
      const sessionId = searchParams.get('session_id');
      const checkout = searchParams.get('checkout');

      if (checkout === 'success' && sessionId) {
        try {
          const result = await verifyCheckoutSession(sessionId);
          setCheckoutNotice(
            result.confirmed
              ? `You're now on the ${PLAN_LABELS[result.tier as SubscriptionTier] || result.tier} plan.`
              : 'Payment is still processing — check back in a moment.'
          );
        } catch {
          setCheckoutNotice('Could not confirm checkout status.');
        }
      } else if (checkout === 'cancelled') {
        setCheckoutNotice('Checkout was cancelled — no changes were made.');
      }

      try {
        setBusiness(await fetchBusiness());
      } catch {
        setError('Could not load business profile.');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleUpgrade(tier: SubscriptionTier) {
    setActionLoading(tier);
    try {
      const { url } = await createCheckoutSession(tier, billingPeriod);
      window.location.href = url;
    } catch {
      setError('Could not start checkout. Please try again.');
      setActionLoading(null);
    }
  }

  async function handleManageBilling() {
    setActionLoading('portal');
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setError('Could not open billing portal. Please try again.');
      setActionLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your account and monitoring preferences</p>
        </div>

        {checkoutNotice && (
          <div className="card border-teal/20 bg-teal-glow/20">
            <p className="text-sm text-gray-200">{checkoutNotice}</p>
          </div>
        )}

        {(authLoading || !user || loading) && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-status-critical">{error}</p>}

        {!loading && business && (
          <>
            <div className="card space-y-4">
              <p className="text-sm font-medium text-gray-200">Business Profile</p>
              {[
                { label: 'Business Name', value: business.name },
                { label: 'Industry', value: business.industry },
                { label: 'AI Tool', value: business.aiToolDescription },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-surface-border last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs text-gray-300 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="card space-y-4">
              <p className="text-sm font-medium text-gray-200">Monitoring Thresholds</p>
              {[
                { label: 'Alert on quality drop below', value: '70/100' },
                { label: 'Critical alert threshold', value: '60/100' },
                { label: 'Baseline recalculation', value: 'Weekly' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-surface-border last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs text-teal">{value}</span>
                </div>
              ))}
            </div>

            <div className="card space-y-4">
              <p className="text-sm font-medium text-gray-200">Subscription</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">{PLAN_LABELS[business.subscriptionTier]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {business.currentMonthCount.toLocaleString()} / {business.monthlyConversationLimit.toLocaleString()} conversations this month
                  </p>
                </div>
                {business.subscriptionTier !== 'free' && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={handleManageBilling}
                    disabled={actionLoading === 'portal'}
                  >
                    {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
                  </button>
                )}
              </div>

              {business.subscriptionTier === 'free' && (
                <div className="space-y-4 pt-2">
                  {/* Monthly / Yearly Billing Toggle */}
                  <div className="flex items-center gap-3 bg-navy-950 p-3 rounded-lg border border-surface-border">
                    <span className={`text-xs font-medium ${billingPeriod === 'monthly' ? 'text-teal' : 'text-gray-400'}`}>Monthly Billing</span>
                    <button
                      onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                      className="w-10 h-6 bg-navy-900 border border-surface-border rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center"
                    >
                      <div className={`w-4 h-4 rounded-full bg-teal transition-transform duration-200 transform ${billingPeriod === 'yearly' ? 'translate-x-4' : ''}`} />
                    </button>
                    <span className={`text-xs font-medium ${billingPeriod === 'yearly' ? 'text-teal' : 'text-gray-400'}`}>
                      Yearly Billing <span className="bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded text-[10px] ml-1">Save 20%</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {UPGRADE_OPTIONS.map((opt) => (
                      <div
                        key={opt.tier}
                        className="flex items-center justify-between bg-navy-900 rounded-lg px-4 py-3 border border-surface-border"
                      >
                        <div>
                          <p className="text-sm text-gray-200 font-medium">{opt.label} — {opt.price[billingPeriod]}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.blurb}</p>
                        </div>
                        <button
                          className="btn-primary text-xs shrink-0"
                          onClick={() => handleUpgrade(opt.tier)}
                          disabled={actionLoading === opt.tier}
                        >
                          {actionLoading === opt.tier ? 'Redirecting...' : 'Upgrade'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card space-y-4">
              <p className="text-sm font-medium text-gray-200">User Profile Settings</p>
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="displayName" className="text-xs text-gray-500 font-medium">Display Name</label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input h-10 py-1.5"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-gray-500">
                    Email Status: {user?.emailVerified ? <span className="text-status-healthy font-semibold">Verified</span> : <span className="text-status-warning font-semibold">Pending Verification</span>}
                  </div>
                  <button
                    type="submit"
                    className="btn-primary text-xs px-4 py-1.5 h-auto text-navy-950 font-semibold"
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            <div className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Signed in as</p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
              </div>
              <button className="btn-ghost text-xs border border-surface-border" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
