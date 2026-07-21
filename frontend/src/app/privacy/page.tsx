'use client';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-gray-500 mt-2">Last Updated: July 19, 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">1. Information We Collect</h2>
          <p className="text-sm text-gray-400">
            We collect information that you directly provide to us when registering an account, updating your profile, or integrating your AI chatbots. This includes your email, business name, industry, and descriptions of your AI tools.
          </p>
          <p className="text-sm text-gray-400">
            To provide our real-time audit services, we collect, process, and analyze conversation logs transmitted via our APIs. We also collect usage data, analytics, and device specifications to maintain system health.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">2. How We Use Information</h2>
          <p className="text-sm text-gray-400">
            We use the collected information for the following purposes:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-4">
            <li>To deliver, monitor, analyze, and optimize Tryda’s quality auditing and drift detection systems.</li>
            <li>To manage your account, process payments securely via Stripe, and confirm your subscription status.</li>
            <li>To send critical, automated alerts regarding conversational drift, and weekly plain-English quality reports.</li>
            <li>To enforce our terms and protect the safety, security, and integrity of the platform.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">3. Information Sharing and Disclosure</h2>
          <p className="text-sm text-gray-400">
            We do not sell, rent, or trade your personal or business data with third parties. We share information only in the following scenarios:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-4">
            <li>With trusted third-party service providers (e.g. Firebase for hosting/auth, Stripe for payment handling, Google Gemini API for AI-based analysis) strictly to perform those specialized functions.</li>
            <li>To comply with legal obligations, enforce our policies, or respond to valid governmental requests.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">4. Data Retention and Security</h2>
          <p className="text-sm text-gray-400">
            Tryda uses robust industry-standard electronic safeguards to protect your account and conversational data. We retain your information for as long as your account is active or as necessary to provide you with the Service. 
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">5. Your Choices and Rights</h2>
          <p className="text-sm text-gray-400">
            You can access, modify, or delete your account information at any time via your Settings dashboard. You can also contact support to request complete removal of your business, log history, and stored profiles from our databases.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">6. Changes to this Policy</h2>
          <p className="text-sm text-gray-400">
            We may update this Privacy Policy from time to time. Any material changes will be announced on this page with an updated modification date. Your continued use of the platform after changes are posted constitutes your explicit agreement to the revised policy.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-8 bg-navy-950">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Tryda. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-400 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
