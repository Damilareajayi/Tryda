'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RecommendationCard } from '@/components/RecommendationCard';
import { ExportButtons } from '@/components/ExportButtons';
import { fetchRecommendations, applyRecommendation, fetchBusiness } from '@/lib/api';
import { Recommendation, BusinessProfile } from '@/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchRecommendations(), fetchBusiness()])
      .then(([r, b]) => {
        setRecs(r);
        setBusiness(b);
      })
      .catch(() => setError('Could not load recommendations from the Tryda API.'))
      .finally(() => setLoading(false));
  }, [user]);

  function handleApply(id: string) {
    setRecs((prev) =>
      prev.map((r) => r.id === id ? { ...r, applied: true, appliedAt: new Date().toISOString() } : r)
    );
    applyRecommendation(id).catch(() => {
      setRecs((prev) =>
        prev.map((r) => r.id === id ? { ...r, applied: false, appliedAt: undefined } : r)
      );
    });
  }

  const open = recs.filter((r) => !r.applied);
  const done = recs.filter((r) => r.applied);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Recommendations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI-generated fixes for every detected quality issue
            </p>
          </div>
          {business && (
            <ExportButtons
              tier={business.subscriptionTier}
              filenameBase="tryda-recommendations"
              sheetName="Recommendations"
              rows={recs.map((r) => ({
                id: r.id,
                createdAt: r.createdAt,
                priority: r.priority,
                category: r.category,
                title: r.title,
                description: r.description,
                actionSteps: r.actionSteps.join(' | '),
                estimatedImpact: r.estimatedImpact,
                autoApplicable: r.autoApplicable,
                applied: r.applied,
                appliedAt: r.appliedAt ?? '',
              }))}
            />
          )}
        </div>

        {(authLoading || !user || loading) && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-status-critical">{error}</p>}

        {!loading && !error && open.length > 0 && (
          <section>
            <p className="section-label">Waiting for Action ({open.length})</p>
            <div className="space-y-3">
              {open.map((r) => (
                <RecommendationCard key={r.id} rec={r} onApply={handleApply} />
              ))}
            </div>
          </section>
        )}

        {!loading && !error && done.length > 0 && (
          <section>
            <p className="section-label">Applied ({done.length})</p>
            <div className="space-y-3">
              {done.map((r) => <RecommendationCard key={r.id} rec={r} />)}
            </div>
          </section>
        )}

        {!loading && !error && recs.length === 0 && (
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
