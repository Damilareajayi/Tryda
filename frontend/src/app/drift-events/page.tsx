'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DriftEventCard } from '@/components/DriftEventCard';
import { ExportButtons } from '@/components/ExportButtons';
import { fetchDriftEvents, fetchBusiness } from '@/lib/api';
import { DriftEvent, BusinessProfile } from '@/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function DriftEventsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchDriftEvents(), fetchBusiness()])
      .then(([e, b]) => {
        setEvents(e);
        setBusiness(b);
      })
      .catch(() => setError('Could not load drift events from the Tryda API.'))
      .finally(() => setLoading(false));
  }, [user]);

  const open = events.filter((e) => !e.resolved);
  const resolved = events.filter((e) => e.resolved);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Drift Events</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All detected quality degradation events for your AI
            </p>
          </div>
          {business && (
            <ExportButtons
              tier={business.subscriptionTier}
              filenameBase="tryda-drift-events"
              sheetName="Drift Events"
              rows={events.map((e) => ({
                id: e.id,
                detectedAt: e.detectedAt,
                severity: e.severity,
                rootCause: e.rootCause,
                affectedMetric: e.affectedMetric,
                baselineScore: e.baselineScore,
                currentScore: e.currentScore,
                dropPercentage: e.dropPercentage,
                resolved: e.resolved,
                resolvedAt: e.resolvedAt ?? '',
              }))}
            />
          )}
        </div>

        {(authLoading || !user || loading) && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-status-critical">{error}</p>}

        {!loading && !error && open.length > 0 && (
          <section>
            <p className="section-label">Open — Needs Attention ({open.length})</p>
            <div className="space-y-3">
              {open.map((e) => <DriftEventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

        {!loading && !error && resolved.length > 0 && (
          <section>
            <p className="section-label">Resolved ({resolved.length})</p>
            <div className="space-y-3">
              {resolved.map((e) => <DriftEventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-gray-300 font-medium">No drift events detected</p>
            <p className="text-sm text-gray-500 mt-1">Your AI is performing within baseline parameters.</p>
          </div>
        )}
      </main>
    </div>
  );
}
