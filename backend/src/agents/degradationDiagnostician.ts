import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import {
  DiagnosticsAgentInput,
  DiagnosticsAgentOutput,
  DriftEvent,
  DriftRootCause,
  DriftSeverity,
} from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// CUSUM-style drift detection: compare recent window to baseline
function detectStatisticalDrift(
  baseline: DiagnosticsAgentInput['baseline'],
  currentScore: number
): { driftDetected: boolean; dropPercentage: number; severity: DriftSeverity } {
  const drop = baseline.averageQuality - currentScore;
  const dropPercentage = Math.round((drop / baseline.averageQuality) * 100);
  const sigmas = drop / (baseline.stdDeviation || 1);

  let severity: DriftSeverity = 'none';
  let driftDetected = false;

  if (sigmas >= 1.5 && dropPercentage >= 5) {
    driftDetected = true;
    if (sigmas >= 4 || dropPercentage >= 30) severity = 'critical';
    else if (sigmas >= 3 || dropPercentage >= 20) severity = 'high';
    else if (sigmas >= 2 || dropPercentage >= 10) severity = 'medium';
    else severity = 'low';
  }

  return { driftDetected, dropPercentage, severity };
}

const ROOT_CAUSE_PROMPT = (
  input: DiagnosticsAgentInput,
  dropPercentage: number
) => `
You are an AI reliability diagnostician. Quality drift has been detected in a small business's AI assistant.

Baseline average quality score: ${input.baseline.averageQuality}/100
Current average quality score: ${input.recentScores.averageScore}/100
Drop: ${dropPercentage}%

Recent quality trend (last 7 days):
${input.historicalScores
  .slice(-7)
  .map((h) => `  ${h.date}: ${h.averageScore}/100`)
  .join('\n')}

Flagged conversations (${input.recentScores.flaggedConversations.length} total):
${input.recentScores.scores
  .filter((s) => input.recentScores.flaggedConversations.includes(s.conversationId))
  .slice(0, 3)
  .map(
    (s) =>
      `  - Overall: ${s.score.overall} | Accuracy: ${s.score.accuracy} | Relevance: ${s.score.relevance} | Brand: ${s.score.brandAlignment} | Issue: ${s.score.reasoning}`
  )
  .join('\n')}

Based on the pattern of which quality dimensions dropped most, classify the most likely root cause from these options:
- model_update: The underlying AI model changed its behavior (affects accuracy and consistency uniformly)
- prompt_drift: Prompt configuration has degraded (affects brand alignment and completeness)
- knowledge_staleness: Knowledge base is out of date (accuracy drops on specific topics)
- context_breakdown: Context/memory handling failing (relevance drops, repetitive or off-topic responses)
- volume_spike: Traffic spike affecting response quality
- unknown: Cannot determine from available data

Respond ONLY with valid JSON:
{
  "rootCause": "<one of the options above>",
  "confidence": <0-100>,
  "analysis": "<2-3 sentences explaining the diagnosis based on the data patterns>"
}
`;

export async function runDegradationDiagnostician(
  input: DiagnosticsAgentInput
): Promise<DiagnosticsAgentOutput> {
  const { driftDetected, dropPercentage, severity } = detectStatisticalDrift(
    input.baseline,
    input.recentScores.averageScore
  );

  if (!driftDetected) {
    return {
      driftDetected: false,
      confidence: 95,
      analysis: `Quality score of ${input.recentScores.averageScore} is within normal range of baseline ${input.baseline.averageQuality}. No intervention needed.`,
    };
  }

  // Use Gemini to classify root cause
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let rootCause: DriftRootCause = 'unknown';
  let confidence = 50;
  let analysis = 'Drift detected. Root cause classification failed — manual review recommended.';

  try {
    const result = await model.generateContent(
      ROOT_CAUSE_PROMPT(input, dropPercentage)
    );
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    rootCause = parsed.rootCause as DriftRootCause;
    confidence = parsed.confidence;
    analysis = parsed.analysis;
  } catch {
    // Keep defaults
  }

  const driftEvent: DriftEvent = {
    id: uuidv4(),
    businessId: input.businessId,
    detectedAt: new Date().toISOString(),
    severity,
    rootCause,
    affectedMetric: 'overall_quality',
    baselineScore: input.baseline.averageQuality,
    currentScore: input.recentScores.averageScore,
    dropPercentage,
    sampleConversationIds: input.recentScores.flaggedConversations.slice(0, 5),
    resolved: false,
  };

  return {
    driftDetected: true,
    driftEvent,
    confidence,
    analysis,
  };
}
