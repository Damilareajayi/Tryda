export type DriftRootCause =
  | 'model_update'
  | 'prompt_drift'
  | 'knowledge_staleness'
  | 'context_breakdown'
  | 'volume_spike'
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

export interface QualityTimelinePoint {
  date: string;
  averageScore: number;
  conversationCount: number;
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
  qualityTimeline: QualityTimelinePoint[];
  topIssues: Array<{
    rootCause: DriftRootCause;
    frequency: number;
    avgScoreDrop: number;
  }>;
  recommendations: Recommendation[];
  highlights: string[];
}

export type SubscriptionTier = 'free' | 'individual' | 'enterprise_team' | 'enterprise_business';

export interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  aiToolDescription: string;
  apiKey: string;
  subscriptionTier: SubscriptionTier;
  monthlyConversationLimit: number;
  currentMonthCount: number;
  hasBillingAccount: boolean;
}

// UI state types
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'loading' | 'no-data';

export interface DashboardStats {
  healthScore: number;
  status: HealthStatus;
  totalConversations: number;
  openDriftEvents: number;
  pendingRecommendations: number;
  trend: 'improving' | 'stable' | 'degrading';
  trendPct: number;
}
