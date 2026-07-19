'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { HealthScoreRing } from '@/components/HealthScoreRing';
import { Logo } from '@/components/Logo';
import { AlertTriangle, CheckCircle2, Shield, ArrowRight } from 'lucide-react';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

interface AuditData {
  companyName: string;
  websiteUrl: string;
  score: number;
  issues: string[];
  summary: string;
  actionableFix: string;
  transcript: { role: 'user' | 'assistant'; content: string }[];
  createdAt: string;
}

export default function AuditReportPage() {
  const router = useRouter();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read the query string parameter securely on client side
    const searchParams = new URLSearchParams(window.location.search);
    const auditId = searchParams.get('id');

    if (!auditId) {
      setError('Please provide a valid Tryda Audit Report ID in the URL.');
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'leads', auditId);
    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          setAudit(docSnap.data() as AuditData);
        } else {
          setError('This Tryda Audit Report could not be found or has expired.');
        }
      })
      .catch((err: any) => {
        console.error('Error fetching audit:', err);
        setError('An error occurred while loading this report: ' + (err.message || err));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 text-center text-gray-400">
        <Logo size={48} />
        <p className="mt-4 text-sm animate-pulse">Loading Tryda AI Quality Audit Report...</p>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 text-center text-gray-400">
        <div className="grayscale">
          <Logo size={48} />
        </div>
        <p className="mt-4 text-sm text-status-critical font-medium">{error || 'Failed to load report'}</p>
        <button onClick={() => router.push('/')} className="btn-secondary mt-6 text-xs">
          Return to Tryda Home
        </button>
      </div>
    );
  }

  const status = audit.score >= 85 ? 'healthy' : audit.score >= 70 ? 'warning' : 'critical';

  return (
    <div className="min-h-screen bg-navy-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-bold text-lg text-white tracking-tight">Tryda Audit</span>
          </div>
          <span className="text-xs text-gray-500">
            Generated on {new Date(audit.createdAt).toLocaleDateString()}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Intro Hero Card */}
        <div className="card bg-navy-900 border-surface-border p-8 grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 bg-teal-glow border border-teal/20 rounded-full px-3 py-1 text-xs text-teal font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              Automated Diagnostic Report
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI Chatbot Audit: <span className="text-teal">{audit.companyName}</span>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              We completed a diagnostic reliability audit on the public AI assistant hosted at{' '}
              <a href={audit.websiteUrl} target="_blank" rel="noreferrer" className="text-teal hover:underline font-medium">
                {audit.websiteUrl}
              </a>
              . Probing policy limits, refund constraints, and discount edge cases generated the following health metrics.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <HealthScoreRing score={audit.score} status={status} size={150} />
          </div>
        </div>

        {/* Quality Audit Findings */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Issues Card */}
          <div className="card bg-navy-900 border-surface-border p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-surface-border pb-3">
              <AlertTriangle className="text-status-warning w-5 h-5" />
              <h2 className="text-md font-semibold text-white">Vulnerabilities Detected</h2>
            </div>
            {audit.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-status-healthy">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">No vulnerabilities or hallucinations detected under probing!</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {audit.issues.map((issue, idx) => (
                  <li key={idx} className="flex gap-2.5 text-sm text-gray-300">
                    <span className="text-status-critical shrink-0 mt-0.5 font-bold">×</span>
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI Recommendation Card */}
          <div className="card bg-navy-900 border-surface-border p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-surface-border pb-3">
              <Shield className="text-teal w-5 h-5" />
              <h2 className="text-md font-semibold text-white">Recommended Instruction Fix</h2>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {audit.actionableFix}
            </p>
            <div className="bg-navy-950 rounded-lg p-3 border border-surface-border text-xs text-gray-400 leading-relaxed">
              <strong>Tip:</strong> Apply these adjustments to your AI assistant's system instructions to immediately stop quality drift.
            </div>
          </div>
        </div>

        {/* Transcript Conversation Log */}
        <div className="card bg-navy-900 border-surface-border p-6 space-y-4">
          <div className="border-b border-surface-border pb-3">
            <h2 className="text-md font-semibold text-white">Complete Probing Conversation Log</h2>
            <p className="text-xs text-gray-500 mt-1">
              Showing the exact transcript captured by the Tryda diagnostic crawler during testing.
            </p>
          </div>
          <div className="bg-navy-950 rounded-xl border border-surface-border p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {audit.transcript.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col space-y-1 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-[10px] text-gray-500 font-medium">
                  {msg.role === 'user' ? 'Tryda Evaluator' : `${audit.companyName} Bot`}
                </span>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-teal text-navy-950 font-medium rounded-tr-none'
                      : 'bg-navy-800 text-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="card bg-gradient-to-r from-teal-glow/20 via-navy-900 to-navy-900 border-teal/25 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white">Want continuous AI quality tracking?</h3>
            <p className="text-sm text-gray-400">
              Set up real-time drift detection and 24/7 accuracy monitoring in less than 5 minutes.
            </p>
          </div>
          <button
            onClick={() => router.push('/signup')}
            className="btn-primary flex items-center gap-2 text-navy-950 font-bold px-6 py-3 shrink-0"
          >
            Monitor Your AI Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-8 text-center text-xs text-gray-600">
        <p>© {new Date().getFullYear()} Tryda AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
