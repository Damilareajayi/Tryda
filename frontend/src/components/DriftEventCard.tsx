import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { DriftEvent } from '@/types';
import { cn, severityBg, severityColor, rootCauseLabel, timeAgo } from '@/lib/utils';

interface DriftEventCardProps {
  event: DriftEvent;
}

export function DriftEventCard({ event }: DriftEventCardProps) {
  return (
    <div className={cn(
      'card border rounded-xl p-4 animate-slide-up',
      event.resolved ? 'border-surface-border opacity-70' : severityBg(event.severity)
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {event.resolved ? (
            <CheckCircle size={16} className="text-status-healthy mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={16} className={cn('mt-0.5 shrink-0', severityColor(event.severity))} />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'badge capitalize',
                event.resolved ? 'text-gray-400 border-gray-600' : severityBg(event.severity),
                !event.resolved && severityColor(event.severity)
              )}>
                {event.severity}
              </span>
              <span className="text-sm font-medium text-gray-200">
                {rootCauseLabel(event.rootCause)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Quality dropped {event.dropPercentage}% — from {event.baselineScore} to {event.currentScore}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} />
            {timeAgo(event.detectedAt)}
          </div>
          {event.resolved && (
            <span className="text-xs text-status-healthy mt-1 block">Resolved</span>
          )}
        </div>
      </div>
    </div>
  );
}
