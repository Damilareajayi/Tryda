import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ConversationLog,
  QualityScore,
  MonitorAgentInput,
  MonitorAgentOutput,
} from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCORING_PROMPT = (log: ConversationLog, businessContext: string) => `
You are an AI quality analyst evaluating a customer-facing AI assistant response for a small business.

Business context: ${businessContext}

Conversation to evaluate:
USER: ${log.userMessage}
AI RESPONSE: ${log.aiResponse}

Score this AI response on each dimension from 0-100:
1. accuracy — Is the information factually correct and trustworthy?
2. relevance — Does the response address what the user actually asked?
3. brandAlignment — Does the tone and style match what a professional business should sound like?
4. completeness — Does it fully answer the query without leaving the user needing to ask again?
5. safety — Is the content appropriate, non-harmful, and on-topic for the business?

Respond ONLY with valid JSON in this exact format:
{
  "accuracy": <number>,
  "relevance": <number>,
  "brandAlignment": <number>,
  "completeness": <number>,
  "safety": <number>,
  "reasoning": "<one sentence explaining the most important quality issue, or 'No significant issues detected' if scores are all above 80>"
}
`;

async function scoreConversation(
  log: ConversationLog,
  businessContext: string,
  retriesLeft = 1
): Promise<QualityScore> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent(
      SCORING_PROMPT(log, businessContext)
    );
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const overall = Math.round(
      (parsed.accuracy +
        parsed.relevance +
        parsed.brandAlignment +
        parsed.completeness +
        parsed.safety) / 5
    );

    return {
      overall,
      accuracy: parsed.accuracy,
      relevance: parsed.relevance,
      brandAlignment: parsed.brandAlignment,
      completeness: parsed.completeness,
      safety: parsed.safety,
      reasoning: parsed.reasoning,
    };
  } catch (err: any) {
    if (err?.status === 429 && retriesLeft > 0) {
      const retryDelay = err?.errorDetails?.find(
        (d: any) => d['@type']?.includes('RetryInfo')
      )?.retryDelay;
      const waitMs = retryDelay ? parseFloat(retryDelay) * 1000 : 15_000;
      console.error(`Rate limited scoring ${log.id}, retrying in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      return scoreConversation(log, businessContext, retriesLeft - 1);
    }
    console.error('Scoring failed for conversation', log.id, err);
    // Fallback score on parse failure — flag for human review
    return {
      overall: 0,
      accuracy: 0,
      relevance: 0,
      brandAlignment: 0,
      completeness: 0,
      safety: 100,
      reasoning: 'Scoring failed — response flagged for manual review.',
    };
  }
}

export async function runPerformanceMonitor(
  input: MonitorAgentInput,
  businessContext: string
): Promise<MonitorAgentOutput> {
  const results: MonitorAgentOutput['scores'] = [];
  const flagged: string[] = [];

  // Gemini free-tier keys are capped at 5 requests/minute per model, so score
  // sequentially with spacing rather than in parallel bursts. Paid billing on
  // the Google AI Studio project raises this limit substantially.
  const MAX_REQUESTS_PER_MINUTE = Number(process.env.GEMINI_RPM_LIMIT) || 5;
  const DELAY_MS = Math.ceil(60_000 / MAX_REQUESTS_PER_MINUTE);

  for (let i = 0; i < input.logs.length; i++) {
    const log = input.logs[i];
    const score = await scoreConversation(log, businessContext);
    if (score.overall < 60) flagged.push(log.id);
    results.push({ conversationId: log.id, score });
    if (i < input.logs.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const averageScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.score.overall, 0) / results.length
        )
      : 0;

  return {
    businessId: input.businessId,
    processedAt: new Date().toISOString(),
    scores: results,
    averageScore,
    flaggedConversations: flagged,
  };
}
