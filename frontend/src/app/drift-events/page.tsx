'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DriftEventCard } from '@/components/DriftEventCard';
import { fetchDriftEvents } from '@/lib/api';
import { DriftEvent } from '@/types';

export default function DriftEventsPage() {
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriftEvents()
      .then(setEvents)
      .catch(() => setError('Could not load drift events from the Tryda API.'))
      .finally(() => setLoading(false));
  }, []);

  const open = events.filter((e) => !e.resolved);
  const resolved = events.filter((e) => e.resolved);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Drift Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All detected quality degradation events for your AI
          </p>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading...</p>}
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
