'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, CheckCircle } from 'lucide-react';
import { Recommendation } from '@/types';
import { cn, priorityColor } from '@/lib/utils';

interface RecommendationCardProps {
  rec: Recommendation;
  onApply?: (id: string) => void;
}

export function RecommendationCard({ rec, onApply }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(rec.applied);

  async function handleApply() {
    setApplying(true);
    await onApply?.(rec.id);
    setApplied(true);
    setApplying(false);
  }

  return (
    <div className={cn(
      'card border rounded-xl animate-slide-up',
      applied ? 'opacity-60 border-surface-border' : 'border-surface-border'
    )}>
      <div className="flex items-start gap-3">
        {applied ? (
          <CheckCircle size={16} className="text-status-healthy mt-0.5 shrink-0" />
        ) : (
          <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
            rec.priority === 'critical' ? 'bg-status-critical' :
            rec.priority === 'high' ? 'bg-orange-400' :
            rec.priority === 'medium' ? 'bg-status-warning' : 'bg-blue-400'
          )} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn('badge text-xs capitalize', priorityColor(rec.priority))}>
                  {rec.priority}
                </span>
                <span className="text-xs text-gray-500 capitalize">{rec.category.replace('_', ' ')}</span>
              </div>
              <p className="text-sm font-medium text-gray-100">{rec.title}</p>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-gray-300 shrink-0 mt-0.5"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-1">{rec.description}</p>

          {expanded && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <div>
                <p className="text-xs font-medium text-gray-300 mb-2">Steps to fix:</p>
                <ol className="space-y-1.5">
                  {rec.actionSteps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-400">
                      <span className="text-teal font-mono shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <p className="text-xs text-gray-500">
                  Expected: <span className="text-status-healthy">{rec.estimatedImpact}</span>
                </p>
                {!applied && (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                      rec.autoApplicable
                        ? 'bg-teal text-navy-900 hover:bg-teal-dim'
                        : 'border border-surface-border text-gray-300 hover:bg-surface-hover'
                    )}
                  >
                    {rec.autoApplicable && <Zap size={12} />}
                    {applying ? 'Applying...' : rec.autoApplicable ? 'Auto-apply' : 'Mark resolved'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
