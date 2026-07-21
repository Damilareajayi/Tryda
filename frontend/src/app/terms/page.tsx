'use client';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-gray-200">
      {/* Header */}
      <header className="border-b border-surface-border bg-navy-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="font-bold text-base text-white tracking-tight">Tryda</span>
          </Link>
          <Link href="/" className="btn-ghost text-xs border border-surface-border">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-10 leading-relaxed">
        <div className="border-b border-surface-border pb-6">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Terms of Service</h1>
          <p className="text-xs text-gray-500 mt-2">Last Updated: July 19, 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">1. Acceptance of Terms</h2>
          <p className="text-sm text-gray-400">
            By creating an account, accessing, or using the Tryda platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not use the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">2. The Service</h2>
          <p className="text-sm text-gray-400">
            Tryda provides real-time diagnostic and reliability monitoring services for AI chatbots, agents, and customer support widgets. We reserves the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">3. Accounts and Security</h2>
          <p className="text-sm text-gray-400">
            To use certain features of Tryda, you must register for an account and provide accurate, complete business information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">4. Billing and Subscriptions</h2>
          <p className="text-sm text-gray-400">
            Paid plans are billed on a subscription basis (monthly or yearly) and are managed securely via Stripe. By signing up for a paid tier, you authorize Tryda to charge your credit card for the recurring fee. 
          </p>
          <p className="text-sm text-gray-400">
            Annual subscriptions are billed in full at the start of each billing cycle and offer a 20% discount compared to monthly pricing. Subscription upgrades are applied immediately, while downgrades take effect at the end of the current billing cycle. All payments are non-refundable.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">5. Acceptable Use and Restrictions</h2>
          <p className="text-sm text-gray-400">
            You agree not to use Tryda to monitor or audit conversational tools that promote illegal activities, generate harmful content, or violate any third-party intellectual property or privacy rights. You may not reverse engineer, copy, or exploit any portion of Tryda's codebase or layout without explicit written consent.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">6. Limitation of Liability</h2>
          <p className="text-sm text-gray-400">
            To the maximum extent permitted by law, Tryda and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, use, or goodwill, arising out of or in connection with your use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">7. Governing Law and Changes</h2>
          <p className="text-sm text-gray-400">
            These terms shall be governed by and construed in accordance with the laws of our operating jurisdiction, without regard to its conflict of law principles. We reserve the right to revise these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-8 bg-navy-950">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Tryda. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-400 hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
