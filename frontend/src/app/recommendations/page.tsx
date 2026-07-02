'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RecommendationCard } from '@/components/RecommendationCard';
import { MOCK_RECOMMENDATIONS } from '@/lib/api';
import { Recommendation } from '@/types';

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);

  function handleApply(id: string) {
    setRecs((prev) =>
      prev.map((r) => r.id === id ? { ...r, applied: true, appliedAt: new Date().toISOString() } : r)
    );
  }

  const open = recs.filter((r) => !r.applied);
  const done = recs.filter((r) => r.applied);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Recommendations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-generated fixes for every detected quality issue
          </p>
        </div>

        {open.length > 0 && (
          <section>
            <p className="section-label">Waiting for Action ({open.length})</p>
            <div className="space-y-3">
              {open.map((r) => (
                <RecommendationCard key={r.id} rec={r} onApply={handleApply} />
              ))}
            </div>
          </section>
        )}

        {done.length > 0 && (
          <section>
            <p className="section-label">Applied ({done.length})</p>
            <div className="space-y-3">
              {done.map((r) => <RecommendationCard key={r.id} rec={r} />)}
            </div>
          </section>
        )}

        {recs.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-gray-300 font-medium">No open recommendations</p>
            <p className="text-sm text-gray-500 mt-1">Your AI is running clean.</p>
          </div>
        )}
      </main>
    </div>
  );
}
