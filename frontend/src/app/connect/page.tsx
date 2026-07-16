'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { fetchBusiness } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'key' | 'snippet' | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchBusiness()
      .then((b) => setApiKey(b.apiKey))
      .catch(() => setError('Could not load your API key.'));
  }, [user]);

  function copy(text: string, which: 'key' | 'snippet') {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  if (authLoading || !user || (!apiKey && !error)) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-56 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-56 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-status-critical">{error}</p>
        </main>
      </div>
    );
  }

  const snippet = codeSnippet(apiKey);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-6 space-y-6 max-w-3xl">
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
            <code className="text-teal font-mono text-sm flex-1">{apiKey}</code>
            <button onClick={() => copy(apiKey, 'key')} className="text-gray-500 hover:text-teal transition-colors">
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

        {/* Integrations */}
        <div className="card">
          <p className="section-label">Works with any AI tool</p>
          <div className="grid grid-cols-3 gap-3">
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