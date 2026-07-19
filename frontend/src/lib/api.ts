import { onAuthStateChanged, type User } from 'firebase/auth';
import { PerformanceReport, DriftEvent, Recommendation, BusinessProfile, SubscriptionTier } from '@/types';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Right after signInWithPopup/signInWithRedirect resolves, auth.currentUser
// can momentarily still be null — the SDK finishes committing it a tick
// later. Callers that fire an authenticated request immediately after
// sign-in (Google auth's provisionAccount call) would otherwise fail with
// a bare "Not signed in" before the user ever gets a token. Wait one auth
// state tick instead of assuming currentUser is already set.
function waitForCurrentUser(): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 5000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

// Dashboard-facing endpoints authenticate the logged-in user via their
// Firebase ID token — distinct from the long-lived x-api-key used by
// customers' AI tools to POST /ingest (see ingestLogs below).
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const user = auth.currentUser ?? (await waitForCurrentUser());
  const token = await user?.getIdToken();
  if (!token) throw new Error('Not signed in');

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(`API error: ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function provisionAccount(profile?: {
  name: string;
  industry: string;
  aiToolDescription: string;
}): Promise<{ business: BusinessProfile; created: boolean }> {
  return apiFetch('/auth/provision', {
    method: 'POST',
    body: JSON.stringify(profile || {}),
  });
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

// Uses the business's long-lived x-api-key, not the logged-in user's
// session — this is the same call an external AI tool would make.
export async function ingestLogs(logs: unknown[], apiKey: string): Promise<{
  success: boolean;
  processed: number;
  driftDetected: boolean;
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ logs }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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

export async function sendEmailOTP(email: string): Promise<{ success: boolean; code?: string }> {
  const res = await fetch(`${API_URL}/api/auth/send-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Failed to send email OTP');
  return res.json();
}

export async function verifyEmailOTP(email: string, code: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/auth/verify-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error('Invalid or expired verification code');
  return res.json();
}

export async function sendSMSOTP(phoneNumber: string): Promise<{ success: boolean; code?: string }> {
  const res = await fetch(`${API_URL}/api/auth/send-sms-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  if (!res.ok) throw new Error('Failed to send SMS OTP');
  return res.json();
}

export async function verifySMSOTP(phoneNumber: string, code: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/auth/verify-sms-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, code }),
  });
  if (!res.ok) throw new Error('Invalid or expired verification code');
  return res.json();
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
