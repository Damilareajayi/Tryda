import { clsx, type ClassValue } from 'clsx';
import { DriftSeverity, DriftRootCause, HealthStatus, SubscriptionTier } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function isPremiumTier(tier: SubscriptionTier): boolean {
  return tier !== 'free';
}

export function scoreToStatus(score: number): HealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}

export function severityColor(severity: DriftSeverity): string {
  switch (severity) {
    case 'critical': return 'text-status-critical';
    case 'high': return 'text-orange-400';
    case 'medium': return 'text-status-warning';
    case 'low': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export function severityBg(severity: DriftSeverity): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 border-red-500/30';
    case 'high': return 'bg-orange-500/10 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'low': return 'bg-blue-500/10 border-blue-500/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
}

export function rootCauseLabel(cause: DriftRootCause): string {
  switch (cause) {
    case 'model_update': return 'Model Update';
    case 'prompt_drift': return 'Prompt Drift';
    case 'knowledge_staleness': return 'Stale Knowledge Base';
    case 'context_breakdown': return 'Context Breakdown';
    case 'volume_spike': return 'Volume Spike';
    default: return 'Unknown';
  }
}

export function priorityColor(p: string): string {
  switch (p) {
    case 'critical': return 'text-status-critical bg-red-500/10 border-red-500/30';
    case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'medium': return 'text-status-warning bg-yellow-500/10 border-yellow-500/30';
    default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
