'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Copy, CheckCircle, ExternalLink } from 'lucide-react';

const DEMO_API_KEY = process.env.NEXT_PUBLIC_DEMO_API_KEY || 'dl_live_demo_a1b2c3d4e5f6';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const CODE_SNIPPET = `// Send your AI conversation logs to Tryda
const response = await fetch('${API_URL}/api/ingest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${DEMO_API_KEY}'
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

export default function ConnectPage() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('tryda_api_key', DEMO_API_KEY);
  }, []);

  function copy() {
    navigator.clipboard.writeText(CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
            <code className="text-teal font-mono text-sm flex-1">{DEMO_API_KEY}</code>
            <button onClick={copy} className="text-gray-500 hover:text-teal transition-colors">
              {copied ? <CheckCircle size={14} className="text-status-healthy" /> : <Copy size={14} />}
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
              {CODE_SNIPPET}
            </pre>
            <button
              onClick={copy}
              className="absolute top-3 right-3 btn-ghost text-xs px-2 py-1"
            >
              {copied ? '✓ Copied' : 'Copy'}
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
