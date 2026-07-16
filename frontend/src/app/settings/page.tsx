'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { fetchBusiness, createCheckoutSession, createPortalSession, verifyCheckoutSession } from '@/lib/api';
import { BusinessProfile, SubscriptionTier } from '@/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useAuth } from '@/lib/auth-context';

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free Plan',
  individual: 'Individual Plan',
  enterprise_team: 'Enterprise — Team Plan',
  enterprise_business: 'Enterprise — Business Plan',
};

const UPGRADE_OPTIONS: Array<{ tier: SubscriptionTier; label: string; price: string; blurb: string }> = [
  { tier: 'individual', label: 'Individual', price: '$10/mo', blurb: '1,000 conversations/month · 1 AI tool' },
  { tier: 'enterprise_team', label: 'Enterprise — Team', price: '$50/mo', blurb: '10,000 conversations/month · multiple AI tools' },
  { tier: 'enterprise_business', label: 'Enterprise — Business', price: '$100/mo', blurb: 'Unlimited conversations · dedicated support' },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  async function handleSignOut() {
    await signOut();
    router.push('/signin');
  }

  useEffect(() => {
    if (!user) return;
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
      const { url } = await createCheckoutSession(tier);
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
      <main className="ml-56 flex-1 p-6 space-y-6 max-w-2xl">
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
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {UPGRADE_OPTIONS.map((opt) => (
                    <div
                      key={opt.tier}
                      className="flex items-center justify-between bg-navy-900 rounded-lg px-4 py-3 border border-surface-border"
                    >
                      <div>
                        <p className="text-sm text-gray-200 font-medium">{opt.label} — {opt.price}</p>
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
              )}
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
