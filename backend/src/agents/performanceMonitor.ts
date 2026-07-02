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
  businessContext: string
): Promise<QualityScore> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
  } catch {
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

  // Score conversations in parallel batches of 5 to control API costs
  const BATCH_SIZE = 5;
  for (let i = 0; i < input.logs.length; i += BATCH_SIZE) {
    const batch = input.logs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (log) => {
        const score = await scoreConversation(log, businessContext);
        if (score.overall < 60) flagged.push(log.id);
        return { conversationId: log.id, score };
      })
    );
    results.push(...batchResults);
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
