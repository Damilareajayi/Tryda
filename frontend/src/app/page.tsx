'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, Lightbulb, FileBarChart, Plug, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';

const FEATURES = [
  {
    icon: Activity,
    title: 'Quality Scoring',
    desc: 'Every conversation your AI has is scored for accuracy, relevance, brand tone, and safety — automatically.',
  },
  {
    icon: AlertTriangle,
    title: 'Drift Detection',
    desc: "We learn your AI's healthy baseline, then flag the moment quality starts slipping — before customers notice.",
  },
  {
    icon: Lightbulb,
    title: 'AI-Generated Recommendations',
    desc: 'Get specific, actionable fixes for every issue — not just an alert, but what to actually do about it.',
  },
  {
    icon: FileBarChart,
    title: 'Plain-English Reports',
    desc: "Weekly summaries written for business owners, not engineers. Know what's working and what broke.",
  },
];

const STEPS = [
  { n: '1', title: 'Connect your AI tool', desc: 'Send conversation logs with a single API call from any chatbot or AI assistant.' },
  { n: '2', title: 'We monitor every conversation', desc: 'Tryda scores quality in real time and establishes your baseline automatically.' },
  { n: '3', title: 'Get alerted and fix issues fast', desc: "The moment something drifts, you'll know exactly what happened and how to fix it." },
];

const PLANS = [
  {
    name: 'Free', price: '$0', period: '',
    blurb: 'Get started and see it work',
    features: ['100 conversations/month', '1 AI tool', 'Quality scoring', 'Basic drift alerts', 'CSV/JSON log upload (200 rows)'],
    cta: 'Start free', highlight: false,
  },
  {
    name: 'Individual', price: '$10', period: '/mo',
    blurb: 'For solo builders and small teams',
    features: ['1,000 conversations/month', '1 AI tool', 'Full drift detection', 'AI recommendations', 'CSV & Excel export', 'Bulk log upload (5,000 rows)'],
    cta: 'Get started', highlight: true,
  },
  {
    name: 'Enterprise — Team', price: '$50', period: '/mo',
    blurb: 'For growing support teams',
    features: ['10,000 conversations/month', 'Multiple AI tools', 'Priority alerts', 'Weekly reports', 'CSV & Excel export', 'Bulk log upload (5,000 rows)'],
    cta: 'Get started', highlight: false,
  },
  {
    name: 'Enterprise — Business', price: '$100', period: '/mo',
    blurb: 'For high-volume operations',
    features: ['Unlimited conversations', 'Unlimited AI tools', 'Dedicated support', 'Custom thresholds', 'CSV & Excel export', 'Bulk log upload (5,000 rows)'],
    cta: 'Get started', highlight: false,
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-bold text-lg text-white tracking-tight">Tryda</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-teal-glow border border-teal/20 rounded-full px-3 py-1 text-xs text-teal font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              Diagnostic AI for chatbots &amp; APIs
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 tracking-tight leading-tight">
              Catch AI drift before<br />your customers do.
            </h1>
            <p className="text-lg text-gray-400 mt-5 max-w-2xl mx-auto lg:mx-0">
              Tryda monitors every conversation your AI assistant has, scores its quality in real time,
              and tells you exactly what to fix when something goes wrong.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-8">
              <Link href="/signup" className="btn-primary text-sm px-6 py-3">Start monitoring free</Link>
              <Link href="/signin" className="btn-ghost text-sm px-6 py-3 border border-surface-border">Sign In</Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute w-80 h-80 sm:w-[28rem] sm:h-[28rem] bg-teal/15 rounded-full blur-[90px]" />
            <Link href="/" className="relative">
              <img
                src="/brand/mascot/tryda-mascot-standing.png"
                alt="Tryda mascot"
                className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-surface-border shadow-card animate-fade-in"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card">
              <div className="w-9 h-9 rounded-lg bg-teal-glow flex items-center justify-center mb-3">
                <Icon size={16} className="text-teal" />
              </div>
              <p className="text-sm font-semibold text-gray-100">{title}</p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <p className="section-label text-center">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-6">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="text-center">
              <div className="w-8 h-8 rounded-full bg-teal text-navy-900 text-sm font-bold flex items-center justify-center mx-auto mb-3">
                {n}
              </div>
              <p className="text-sm font-semibold text-gray-100">{title}</p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Plug size={13} /> Works with any AI tool — Intercom Fin, Zendesk AI, custom GPT integrations, and more.
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-100">Simple, usage-based pricing</h2>
          <p className="text-sm text-gray-500 mt-2">Start free. Upgrade when you need more volume.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card flex flex-col ${plan.highlight ? 'border-teal/40 shadow-teal-glow' : ''}`}
            >
              {plan.highlight && (
                <span className="text-[10px] font-semibold text-teal uppercase tracking-wide mb-2">Most popular</span>
              )}
              <p className="text-sm font-semibold text-gray-100">{plan.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{plan.blurb}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-gray-100">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </p>
              <ul className="space-y-2 mt-5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                    <CheckCircle2 size={13} className="text-teal shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={plan.highlight ? 'btn-primary text-sm text-center' : 'btn-ghost text-sm text-center border border-surface-border'}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-sm text-gray-500">Tryda</span>
          </Link>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Tryda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}