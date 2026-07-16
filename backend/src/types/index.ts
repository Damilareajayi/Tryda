// ─── Core Domain Types for Tryda ────────────────────────────────────────

export interface ConversationLog {
  id: string;
  businessId: string;
  sessionId: string;
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  metadata?: {
    model?: string;
    latencyMs?: number;
    tokensUsed?: number;
    channel?: string; // 'chat' | 'whatsapp' | 'voice' | 'email'
  };
}

export interface QualityScore {
  overall: number;          // 0-100
  accuracy: number;         // Factual correctness
  relevance: number;        // Response addresses user intent
  brandAlignment: number;   // Matches business tone/persona
  completeness: number;     // Fully answers the query
  safety: number;           // No harmful/off-topic content
  reasoning: string;        // Gemini's explanation
}

export type DriftRootCause =
  | 'model_update'        // Underlying model changed behavior
  | 'prompt_drift'        // Prompt configuration degraded
  | 'knowledge_staleness' // Knowledge base out of date
  | 'context_breakdown'   // Context handling failing
  | 'volume_spike'        // Unusual traffic affecting quality
  | 'unknown';

export type DriftSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface DriftEvent {
  id: string;
  businessId: string;
  detectedAt: string;
  severity: DriftSeverity;
  rootCause: DriftRootCause;
  affectedMetric: string;
  baselineScore: number;
  currentScore: number;
  dropPercentage: number;
  sampleConversationIds: string[];
  resolved: boolean;
  resolvedAt?: string;
}

export interface Recommendation {
  id: string;
  driftEventId: string;
  businessId: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'prompt' | 'knowledge_base' | 'model_config' | 'escalation_rule' | 'monitoring';
  title: string;
  description: string;
  actionSteps: string[];
  estimatedImpact: string;
  autoApplicable: boolean;
  applied: boolean;
  appliedAt?: string;
}

export interface PerformanceReport {
  businessId: string;
  generatedAt: string;
  period: { from: string; to: string };
  summary: {
    totalConversations: number;
    averageQualityScore: number;
    driftEventsCount: number;
    criticalIncidents: number;
    resolvedIncidents: number;
    trend: 'improving' | 'stable' | 'degrading';
    trendPercentage: number;
  };
  qualityTimeline: Array<{
    date: string;
    averageScore: number;
    conversationCount: number;
  }>;
  topIssues: Array<{
    rootCause: DriftRootCause;
    frequency: number;
    avgScoreDrop: number;
  }>;
  recommendations: Recommendation[];
  highlights: string[];
}

export type SubscriptionTier = 'free' | 'individual' | 'enterprise_team' | 'enterprise_business';

export interface Business {
  id: string;
  uid: string;                // Firebase Auth UID of the owning user
  name: string;
  email: string;
  industry: string;
  aiToolDescription: string;  // What AI tool they're running
  webhookUrl?: string;
  apiKey: string;             // Their Tryda API key for log ingestion
  createdAt: string;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  monthlyConversationLimit: number;
  currentMonthCount: number;
}

export interface MonitoringBaseline {
  businessId: string;
  establishedAt: string;
  sampleSize: number;
  averageQuality: number;
  stdDeviation: number;
  minAcceptable: number;  // baseline - 1.5 * stdDev
  metrics: {
    accuracy: number;
    relevance: number;
    brandAlignment: number;
    completeness: number;
    safety: number;
  };
}

// Agent I/O types
export interface MonitorAgentInput {
  businessId: string;
  logs: ConversationLog[];
}

export interface MonitorAgentOutput {
  businessId: string;
  processedAt: string;
  scores: Array<{ conversationId: string; score: QualityScore }>;
  averageScore: number;
  flaggedConversations: string[];
}

export interface DiagnosticsAgentInput {
  businessId: string;
  baseline: MonitoringBaseline;
  recentScores: MonitorAgentOutput;
  historicalScores: Array<{ date: string; averageScore: number }>;
}

export interface DiagnosticsAgentOutput {
  driftDetected: boolean;
  driftEvent?: DriftEvent;
  confidence: number;
  analysis: string;
}

export interface RecommendationAgentInput {
  driftEvent: DriftEvent;
  business: Pick<Business, 'id' | 'name' | 'industry' | 'aiToolDescription'>;
  recentLogs: ConversationLog[];
}

export interface ReportingAgentInput {
  businessId: string;
  periodDays: number;
}
