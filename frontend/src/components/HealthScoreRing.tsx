'use client';
import { useEffect, useRef } from 'react';
import { HealthStatus } from '@/types';
import { cn } from '@/lib/utils';

interface HealthScoreRingProps {
  score: number;
  status: HealthStatus;
  size?: number;
}

const statusConfig = {
  healthy: { color: '#00D4B4', label: 'Healthy', textColor: 'text-teal' },
  warning: { color: '#F59E0B', label: 'Warning', textColor: 'text-status-warning' },
  critical: { color: '#EF4444', label: 'Critical', textColor: 'text-status-critical' },
  loading: { color: '#374151', label: 'Loading', textColor: 'text-gray-400' },
  'no-data': { color: '#374151', label: 'No Data', textColor: 'text-gray-400' },
};

export function HealthScoreRing({ score, status, size = 160 }: HealthScoreRingProps) {
  const progressRef = useRef<SVGCircleElement>(null);
  const config = statusConfig[status];

  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.3
  const targetOffset = circumference - (score / 100) * circumference;

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.setProperty('--target-offset', `${targetOffset}px`);
      progressRef.current.style.strokeDashoffset = `${targetOffset}`;
    }
  }, [targetOffset]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          'relative',
          status === 'critical' && 'ring-critical',
          status === 'healthy' && 'ring-healthy'
        )}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="#1F2D40"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            ref={progressRef}
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            className="health-ring-progress transition-all duration-1000"
            style={{ '--target-offset': `${targetOffset}` } as React.CSSProperties}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-3xl font-bold tabular-nums', config.textColor)}>
            {status === 'loading' ? '—' : score}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="text-center">
        <p className={cn('text-sm font-semibold', config.textColor)}>
          {config.label}
        </p>
        <p className="text-xs text-gray-500">AI Quality Score</p>
      </div>
    </div>
  );
}
