import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFirestore } from 'firebase-admin/firestore';
import { PerformanceReport, DriftEvent, Recommendation } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const HIGHLIGHTS_PROMPT = (report: Omit<PerformanceReport, 'highlights'>) => `
You are writing a plain-language performance summary for a small business owner about their AI assistant.
They are not technical. They care about: is my AI helping my customers well? What broke? What did we fix?

Data:
- Period: ${report.period.from} to ${report.period.to}
- Total conversations monitored: ${report.summary.totalConversations}
- Average quality score: ${report.summary.averageQualityScore}/100
- Trend: ${report.summary.trend} (${report.summary.trendPercentage > 0 ? '+' : ''}${report.summary.trendPercentage}%)
- Drift events: ${report.summary.driftEventsCount}
- Critical incidents: ${report.summary.criticalIncidents}
- Resolved incidents: ${report.summary.resolvedIncidents}
- Top issues: ${report.topIssues.map((i) => `${i.rootCause} (${i.frequency}x)`).join(', ') || 'None'}

Write exactly 3 short, plain-English highlight bullets. Each bullet is one sentence. No jargon. No markdown.
The tone is direct and reassuring but honest — like a trusted advisor, not a PR release.

Respond ONLY with a JSON array of 3 strings:
["<highlight 1>", "<highlight 2>", "<highlight 3>"]
`;

export async function runReportingEngine(
  businessId: string,
  periodDays: number = 7
): Promise<PerformanceReport> {
  const db = getFirestore();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch quality scores for the period
  const scoresSnap = await db
    .collection('qualityScores')
    .where('businessId', '==', businessId)
    .where('processedAt', '>=', periodStart.toISOString())
    .orderBy('processedAt', 'asc')
    .get();

  // Fetch drift events for the period
  const driftSnap = await db
    .collection('driftEvents')
    .where('businessId', '==', businessId)
    .where('detectedAt', '>=', periodStart.toISOString())
    .get();

  // Fetch recommendations for the period
  const recsSnap = await db
    .collection('recommendations')
    .where('businessId', '==', businessId)
    .where('createdAt', '>=', periodStart.toISOString())
    .get();

  const scores = scoresSnap.docs.map((d) => d.data());
  const driftEvents = driftSnap.docs.map((d) => d.data() as DriftEvent);
  const recommendations = recsSnap.docs.map((d) => d.data() as Recommendation);

  // Build quality timeline by day
  const timelineMap = new Map<string, { total: number; count: number }>();
  scores.forEach((s) => {
    const day = s.processedAt.slice(0, 10);
    const existing = timelineMap.get(day) || { total: 0, count: 0 };
    timelineMap.set(day, {
      total: existing.total + (s.averageScore || 0),
      count: existing.count + 1,
    });
  });

  const qualityTimeline = Array.from(timelineMap.entries()).map(([date, v]) => ({
    date,
    averageScore: Math.round(v.total / v.count),
    conversationCount: v.count,
  }));

  const totalConversations = scores.reduce((sum, s) => sum + (s.conversationCount || 1), 0);
  const averageQualityScore =
    qualityTimeline.length > 0
      ? Math.round(
          qualityTimeline.reduce((sum, t) => sum + t.averageScore, 0) /
            qualityTimeline.length
        )
      : 0;

  // Trend: compare first half vs second half of period
  const mid = Math.floor(qualityTimeline.length / 2);
  const firstHalfAvg =
    mid > 0
      ? qualityTimeline.slice(0, mid).reduce((s, t) => s + t.averageScore, 0) / mid
      : averageQualityScore;
  const secondHalfAvg =
    mid > 0
      ? qualityTimeline.slice(mid).reduce((s, t) => s + t.averageScore, 0) /
        (qualityTimeline.length - mid)
      : averageQualityScore;
  const trendPercentage = Math.round(((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100);
  const trend =
    trendPercentage > 2 ? 'improving' : trendPercentage < -2 ? 'degrading' : 'stable';

  // Top issues by root cause frequency
  const causeCounts = new Map<string, { frequency: number; totalDrop: number }>();
  driftEvents.forEach((e) => {
    const existing = causeCounts.get(e.rootCause) || { frequency: 0, totalDrop: 0 };
    causeCounts.set(e.rootCause, {
      frequency: existing.frequency + 1,
      totalDrop: existing.totalDrop + e.dropPercentage,
    });
  });

  const topIssues = Array.from(causeCounts.entries())
    .map(([rootCause, v]) => ({
      rootCause: rootCause as DriftEvent['rootCause'],
      frequency: v.frequency,
      avgScoreDrop: Math.round(v.totalDrop / v.frequency),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);

  const reportBase: Omit<PerformanceReport, 'highlights'> = {
    businessId,
    generatedAt: now.toISOString(),
    period: {
      from: periodStart.toISOString(),
      to: now.toISOString(),
    },
    summary: {
      totalConversations,
      averageQualityScore,
      driftEventsCount: driftEvents.length,
      criticalIncidents: driftEvents.filter((e) => e.severity === 'critical').length,
      resolvedIncidents: driftEvents.filter((e) => e.resolved).length,
      trend,
      trendPercentage,
    },
    qualityTimeline,
    topIssues,
    recommendations: recommendations.filter((r) => !r.applied).slice(0, 5),
  };

  // Generate plain-language highlights via Gemini
  let highlights: string[] = [
    'Your AI assistant activity has been monitored for the selected period.',
    driftEvents.length === 0
      ? 'No quality drift was detected — your AI is performing consistently.'
      : `${driftEvents.length} drift event(s) were detected and flagged for your attention.`,
    recommendations.length > 0
      ? `${recommendations.length} improvement recommendation(s) are waiting for your review.`
      : 'No open recommendations at this time.',
  ];

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(HIGHLIGHTS_PROMPT(reportBase));
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    highlights = JSON.parse(clean);
  } catch {
    // Keep fallback highlights
  }

  return { ...reportBase, highlights };
}
