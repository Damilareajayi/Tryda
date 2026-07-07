import { PerformanceReport, DriftEvent, Recommendation, BusinessProfile, SubscriptionTier } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tryda_api_key') || '';
  }
  return '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchReport(days = 7): Promise<PerformanceReport> {
  return apiFetch<PerformanceReport>(`/report?days=${days}`);
}

export async function fetchDriftEvents(): Promise<DriftEvent[]> {
  return apiFetch<DriftEvent[]>('/drift-events');
}

export async function fetchRecommendations(): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>('/recommendations');
}

export async function applyRecommendation(id: string): Promise<void> {
  return apiFetch(`/recommendations/${id}/apply`, { method: 'PATCH' });
}

export async function ingestLogs(logs: unknown[]): Promise<unknown> {
  return apiFetch('/ingest', {
    method: 'POST',
    body: JSON.stringify({ logs }),
  });
}

export async function fetchBusiness(): Promise<BusinessProfile> {
  return apiFetch<BusinessProfile>('/business');
}

export async function createCheckoutSession(tier: SubscriptionTier): Promise<{ url: string }> {
  return apiFetch('/billing/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return apiFetch('/billing/create-portal-session', { method: 'POST' });
}

export async function verifyCheckoutSession(sessionId: string): Promise<{ confirmed: boolean; tier?: string }> {
  return apiFetch(`/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`);
}

// ── Mock data for demo / development ────────────────────────────────────────
export const MOCK_REPORT: PerformanceReport = {
  businessId: 'demo-business',
  generatedAt: new Date().toISOString(),
  period: {
    from: new Date(Date.now() - 7 * 86400000).toISOString(),
    to: new Date().toISOString(),
  },
  summary: {
    totalConversations: 1284,
    averageQualityScore: 74,
    driftEventsCount: 3,
    criticalIncidents: 1,
    resolvedIncidents: 2,
    trend: 'degrading',
    trendPercentage: -12,
  },
  qualityTimeline: [
    { date: '2026-06-26', averageScore: 88, conversationCount: 178 },
    { date: '2026-06-27', averageScore: 85, conversationCount: 192 },
    { date: '2026-06-28', averageScore: 87, conversationCount: 165 },
    { date: '2026-06-29', averageScore: 82, conversationCount: 201 },
    { date: '2026-06-30', averageScore: 71, conversationCount: 188 },
    { date: '2026-07-01', averageScore: 65, conversationCount: 194 },
    { date: '2026-07-02', averageScore: 74, conversationCount: 166 },
  ],
  topIssues: [
    { rootCause: 'prompt_drift', frequency: 2, avgScoreDrop: 18 },
    { rootCause: 'knowledge_staleness', frequency: 1, avgScoreDrop: 24 },
  ],
  recommendations: [],
  highlights: [
    'Your AI handled 1,284 customer conversations this week.',
    'Quality dropped 12% on June 30 — a prompt drift event was detected and flagged.',
    'Two of three incidents have been resolved. One recommendation is waiting for your action.',
  ],
};

export const MOCK_DRIFT_EVENTS: DriftEvent[] = [
  {
    id: 'evt-001',
    businessId: 'demo-business',
    detectedAt: '2026-06-30T14:22:00Z',
    severity: 'critical',
    rootCause: 'prompt_drift',
    affectedMetric: 'overall_quality',
    baselineScore: 87,
    currentScore: 63,
    dropPercentage: 28,
    sampleConversationIds: ['conv-1', 'conv-2', 'conv-3'],
    resolved: false,
  },
  {
    id: 'evt-002',
    businessId: 'demo-business',
    detectedAt: '2026-06-28T09:10:00Z',
    severity: 'medium',
    rootCause: 'knowledge_staleness',
    affectedMetric: 'overall_quality',
    baselineScore: 87,
    currentScore: 71,
    dropPercentage: 18,
    sampleConversationIds: ['conv-4', 'conv-5'],
    resolved: true,
    resolvedAt: '2026-06-28T16:45:00Z',
  },
  {
    id: 'evt-003',
    businessId: 'demo-business',
    detectedAt: '2026-06-26T11:33:00Z',
    severity: 'low',
    rootCause: 'volume_spike',
    affectedMetric: 'overall_quality',
    baselineScore: 87,
    currentScore: 80,
    dropPercentage: 8,
    sampleConversationIds: ['conv-6'],
    resolved: true,
    resolvedAt: '2026-06-26T14:00:00Z',
  },
];

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-001',
    driftEventId: 'evt-001',
    businessId: 'demo-business',
    createdAt: '2026-06-30T14:25:00Z',
    priority: 'critical',
    category: 'prompt',
    title: 'Restore your system prompt to the last known good version',
    description:
      'Your AI system prompt appears to have been modified recently, causing responses to drift off-brand. Reverting to the version from June 28 should restore quality.',
    actionSteps: [
      'Go to your AI tool\'s settings and open the "System Prompt" section',
      'Replace the current prompt with the backup saved on June 28',
      'Run a test conversation to confirm quality has recovered',
    ],
    estimatedImpact: '+20 quality points within 24 hours',
    autoApplicable: false,
    applied: false,
  },
  {
    id: 'rec-002',
    driftEventId: 'evt-001',
    businessId: 'demo-business',
    createdAt: '2026-06-30T14:25:00Z',
    priority: 'high',
    category: 'knowledge_base',
    title: 'Update your product pricing information',
    description:
      'Several flagged conversations show your AI giving outdated pricing. Refreshing the knowledge base with current prices will fix accuracy issues immediately.',
    actionSteps: [
      'Export your current product catalog as a PDF or CSV',
      'Upload the updated file to your AI tool\'s knowledge base',
      'Trigger a knowledge base sync if your tool requires it',
    ],
    estimatedImpact: '+12 accuracy points',
    autoApplicable: false,
    applied: false,
  },
  {
    id: 'rec-003',
    driftEventId: 'evt-001',
    businessId: 'demo-business',
    createdAt: '2026-06-30T14:25:00Z',
    priority: 'medium',
    category: 'escalation_rule',
    title: 'Add an escalation rule for billing questions',
    description:
      'Billing queries are being answered incorrectly in 34% of cases. Adding a rule to route these to a human agent will protect customer trust while you fix the root issue.',
    actionSteps: [
      'Open your AI tool\'s escalation or routing settings',
      'Add a rule: if message contains "billing", "charge", or "invoice" → route to human',
      'Test the rule with a sample billing query',
    ],
    estimatedImpact: 'Eliminates billing errors while root cause is resolved',
    autoApplicable: true,
    applied: false,
  },
];
