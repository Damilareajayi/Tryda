import { getFirestore } from 'firebase-admin/firestore';
import { runPerformanceMonitor } from '../agents/performanceMonitor';
import { runDegradationDiagnostician } from '../agents/degradationDiagnostician';
import { runRecommendationEngine } from '../agents/recommendationEngine';
import { getBaseline, establishBaseline } from './baseline';
import { ConversationLog, Business } from '../types';

export async function runMonitoringPipeline(
  business: Business,
  logs: ConversationLog[]
): Promise<{
  success: boolean;
  processed: number;
  averageScore: number;
  driftDetected: boolean;
  driftEventId?: string;
  recommendationsGenerated: number;
  message: string;
}> {
  const db = getFirestore();

  // ── Step 1: Performance Monitor Agent ──────────────────────────────────────
  const monitorOutput = await runPerformanceMonitor(
    { businessId: business.id, logs },
    `${business.name} is a ${business.industry} business. Their AI tool: ${business.aiToolDescription}`
  );

  // Persist scores
  await db.collection('qualityScores').add({
    ...monitorOutput,
    conversationCount: logs.length,
  });

  // ── Step 2: Check/Establish Baseline ───────────────────────────────────────
  let baseline = await getBaseline(business.id);
  if (!baseline) {
    if (monitorOutput.scores.length < 10) {
      return {
        success: true,
        processed: logs.length,
        averageScore: monitorOutput.averageScore,
        driftDetected: false,
        recommendationsGenerated: 0,
        message: `Baseline building: ${monitorOutput.scores.length} conversations scored. Need 10+ to enable drift detection.`,
      };
    }
    baseline = await establishBaseline(business.id, monitorOutput);
  }

  // Fetch historical scores for trend context
  const historySnap = await db
    .collection('qualityScores')
    .where('businessId', '==', business.id)
    .get();

  const historicalScores = historySnap.docs
    .map((d) => ({
      date: (d.data().processedAt as string).slice(0, 10),
      averageScore: d.data().averageScore as number,
      processedAt: d.data().processedAt as string,
    }))
    .sort((a, b) => b.processedAt.localeCompare(a.processedAt))
    .slice(0, 14)
    .reverse()
    .map(({ date, averageScore }) => ({ date, averageScore }));

  // ── Step 3: Degradation Diagnostician Agent ────────────────────────────────
  const diagnostics = await runDegradationDiagnostician({
    businessId: business.id,
    baseline,
    recentScores: monitorOutput,
    historicalScores,
  });

  let driftEventId: string | undefined;
  let recommendationsGenerated = 0;

  if (diagnostics.driftDetected && diagnostics.driftEvent) {
    // Persist drift event
    await db
      .collection('driftEvents')
      .doc(diagnostics.driftEvent.id)
      .set(diagnostics.driftEvent);

    driftEventId = diagnostics.driftEvent.id;

    // ── Step 4: Recommendation Engine Agent ─────────────────────────────────
    const recommendations = await runRecommendationEngine({
      driftEvent: diagnostics.driftEvent,
      business: {
        id: business.id,
        name: business.name,
        industry: business.industry,
        aiToolDescription: business.aiToolDescription,
      },
      recentLogs: logs.filter((l) =>
        monitorOutput.flaggedConversations.includes(l.id)
      ),
    });

    // Persist recommendations
    const batch = db.batch();
    recommendations.forEach((rec) => {
      batch.set(db.collection('recommendations').doc(rec.id), rec);
    });
    await batch.commit();
    recommendationsGenerated = recommendations.length;
  }

  return {
    success: true,
    processed: logs.length,
    averageScore: monitorOutput.averageScore,
    driftDetected: diagnostics.driftDetected,
    driftEventId,
    recommendationsGenerated,
    message: diagnostics.driftDetected
      ? `Drift detected (${diagnostics.driftEvent?.severity} severity). ${recommendationsGenerated} recommendations generated.`
      : `All clear. Quality score: ${monitorOutput.averageScore}/100`,
  };
}
