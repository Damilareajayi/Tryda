import { getFirestore } from 'firebase-admin/firestore';
import { MonitoringBaseline, MonitorAgentOutput } from '../types';

// Establish baseline from first N scored conversations (minimum 20)
export async function establishBaseline(
  businessId: string,
  initialScores: MonitorAgentOutput
): Promise<MonitoringBaseline> {
  const scores = initialScores.scores.map((s) => s.score.overall);
  const n = scores.length;

  if (n < 10) {
    throw new Error(
      `Need at least 10 scored conversations to establish a baseline. Got ${n}.`
    );
  }

  const avg = scores.reduce((sum, s) => sum + s, 0) / n;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const metricKeys = ['accuracy', 'relevance', 'brandAlignment', 'completeness', 'safety'] as const;
  const metricAverages = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      Math.round(
        initialScores.scores.reduce((sum, s) => sum + s.score[key], 0) /
          initialScores.scores.length
      ),
    ])
  ) as MonitoringBaseline['metrics'];

  const baseline: MonitoringBaseline = {
    businessId,
    establishedAt: new Date().toISOString(),
    sampleSize: n,
    averageQuality: Math.round(avg),
    stdDeviation: Math.round(stdDev * 10) / 10,
    minAcceptable: Math.round(avg - 1.5 * stdDev),
    metrics: metricAverages,
  };

  await getFirestore()
    .collection('baselines')
    .doc(businessId)
    .set(baseline);

  return baseline;
}

export async function getBaseline(
  businessId: string
): Promise<MonitoringBaseline | null> {
  const doc = await getFirestore()
    .collection('baselines')
    .doc(businessId)
    .get();

  if (!doc.exists) return null;
  return doc.data() as MonitoringBaseline;
}

// Update baseline with rolling window (runs weekly)
export async function updateBaseline(
  businessId: string,
  newScores: MonitorAgentOutput
): Promise<MonitoringBaseline> {
  const existing = await getBaseline(businessId);
  if (!existing) return establishBaseline(businessId, newScores);

  // Weighted average: 70% existing baseline, 30% new data
  const newAvg =
    newScores.scores.reduce((sum, s) => sum + s.score.overall, 0) /
    newScores.scores.length;

  const updatedAvg = Math.round(0.7 * existing.averageQuality + 0.3 * newAvg);

  const updated: MonitoringBaseline = {
    ...existing,
    averageQuality: updatedAvg,
    sampleSize: existing.sampleSize + newScores.scores.length,
  };

  await getFirestore()
    .collection('baselines')
    .doc(businessId)
    .set(updated);

  return updated;
}
