'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { fetchBusiness, ingestLogs } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { parseLogFile, SAMPLE_CSV } from '@/lib/logUpload';
import { downloadText } from '@/lib/export';
import { isPremiumTier } from '@/lib/utils';
import { BusinessProfile } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const FREE_UPLOAD_CAP = 200;
const PREMIUM_UPLOAD_CAP = 5000;

function codeSnippet(apiKey: string) {
  return `// Send your AI conversation logs to Tryda
const response = await fetch('${API_URL}/api/ingest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey}'
  },
  body: JSON.stringify({
    logs: [{
      sessionId: 'session-abc123',
      timestamp: new Date().toISOString(),
      userMessage: 'What are your shipping rates?',
      aiResponse: 'We offer free shipping on orders over $50...',
      metadata: { channel: 'chat', latencyMs: 342 }
    }]
  })
});`;
}

export default function ConnectPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'key' | 'snippet' | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ processed: number; skipped: number; driftDetected: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchBusiness()
      .then(setBusiness)
      .catch(() => setError('Could not load your API key.'));
  }, [user]);

  function copy(text: string, which: 'key' | 'snippet') {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleFileUpload(file: File) {
    if (!business) return;
    setUploadError(null);
    setUploadResult(null);
    setUploading(true);
    try {
      const { logs, skipped } = await parseLogFile(file);
      if (logs.length === 0) {
        setUploadError('No valid log rows found in that file. Check the format and try again.');
        return;
      }

      const cap = isPremiumTier(business.subscriptionTier) ? PREMIUM_UPLOAD_CAP : FREE_UPLOAD_CAP;
      const capped = logs.slice(0, cap);
      const truncatedCount = logs.length - capped.length;

      let processed = 0;
      let driftDetected = false;
      setUploadProgress({ done: 0, total: capped.length });

      for (let i = 0; i < capped.length; i += 100) {
        const batch = capped.slice(i, i + 100);
        const result = await ingestLogs(batch, business.apiKey);
        processed += batch.length;
        if (result.driftDetected) driftDetected = true;
        setUploadProgress({ done: processed, total: capped.length });
      }

      setUploadResult({ processed, skipped: skipped + truncatedCount, driftDetected });
    } catch {
      setUploadError('Could not parse or upload that file. Make sure it matches the expected format.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  if (authLoading || !user || (!business && !error)) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-status-critical">{error}</p>
        </main>
      </div>
    );
  }

  const snippet = codeSnippet(business.apiKey);
  const premium = isPremiumTier(business.subscriptionTier);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Connect Your AI Tool</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Send conversation logs to Tryda in 3 steps
          </p>
        </div>

        {/* Step 1 */}
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-teal text-navy-900 text-xs font-bold flex items-center justify-center">1</span>
            <p className="text-sm font-medium text-gray-200">Your API Key</p>
          </div>
          <div className="flex items-center gap-3 bg-navy-900 rounded-lg px-4 py-3 border border-surface-border">
            <code className="text-teal font-mono text-sm flex-1">{business.apiKey}</code>
            <button onClick={() => copy(business.apiKey, 'key')} className="text-gray-500 hover:text-teal transition-colors">
              {copied === 'key' ? <CheckCircle size={14} className="text-status-healthy" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Keep this key private. Pass it as the <code className="text-teal">x-api-key</code> header in all requests.
          </p>
        </div>

        {/* Step 2 */}
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-teal text-navy-900 text-xs font-bold flex items-center justify-center">2</span>
            <p className="text-sm font-medium text-gray-200">Send conversation logs after each AI response</p>
          </div>
          <div className="relative">
            <pre className="bg-navy-900 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto border border-surface-border leading-relaxed">
              {snippet}
            </pre>
            <button
              onClick={() => copy(snippet, 'snippet')}
              className="absolute top-3 right-3 btn-ghost text-xs px-2 py-1"
            >
              {copied === 'snippet' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-teal text-navy-900 text-xs font-bold flex items-center justify-center">3</span>
            <p className="text-sm font-medium text-gray-200">Watch your dashboard update in real time</p>
          </div>
          <p className="text-sm text-gray-400">
            Once Tryda receives 10+ conversations, it establishes your quality baseline and drift detection activates automatically.
            You'll be notified immediately when your AI's quality drops.
          </p>
          <a href="/dashboard" className="btn-primary inline-flex items-center gap-2 w-fit">
            Go to Dashboard <ExternalLink size={13} />
          </a>
        </div>

        {/* Step 4: manual upload */}
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-teal text-navy-900 text-xs font-bold flex items-center justify-center">4</span>
            <p className="text-sm font-medium text-gray-200">Or upload existing logs</p>
          </div>
          <p className="text-sm text-gray-400">
            Already have chat transcripts or telemetry exported somewhere? Upload a CSV or JSON file
            and Tryda will score it the same way as live traffic — handy for testing or backfilling history.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <label className={`btn-primary text-sm ${uploading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              {uploading ? 'Uploading...' : 'Choose file'}
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => downloadText('tryda-sample-logs.csv', SAMPLE_CSV, 'text/csv')}
              className="btn-ghost text-xs border border-surface-border"
            >
              Download sample CSV
            </button>
          </div>

          {uploading && uploadProgress && (
            <p className="text-xs text-gray-500">
              Uploading {uploadProgress.done} / {uploadProgress.total}...
            </p>
          )}

          {uploadError && (
            <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg px-3 py-2 text-xs text-status-critical">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="bg-teal-glow/20 border border-teal/20 rounded-lg px-3 py-2 text-xs text-gray-300 space-y-1">
              <p>Uploaded {uploadResult.processed} conversation{uploadResult.processed === 1 ? '' : 's'}.</p>
              {uploadResult.skipped > 0 && (
                <p className="text-gray-500">
                  {uploadResult.skipped} row(s) skipped — missing fields or over the plan's row limit.
                </p>
              )}
              {uploadResult.driftDetected && (
                <p className="text-status-warning">Drift detected in this batch — check the Drift Events page.</p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-600">
            {premium
              ? `Up to ${PREMIUM_UPLOAD_CAP.toLocaleString()} rows per upload on your plan.`
              : `Free plan: up to ${FREE_UPLOAD_CAP} rows per upload. Upgrade for larger bulk imports.`}
          </p>
        </div>

        {/* Integrations */}
        <div className="card">
          <p className="section-label">Works with any AI tool</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['Intercom Fin', 'Zendesk AI', 'Custom GPT', 'Tidio', 'Crisp', 'Any HTTP API'].map((tool) => (
              <div key={tool} className="bg-navy-900 border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-400 text-center">
                {tool}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
