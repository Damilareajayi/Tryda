import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { RecommendationAgentInput, Recommendation } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const RECOMMENDATION_PROMPT = (input: RecommendationAgentInput) => `
You are an AI reliability consultant helping a small business fix quality drift in their AI assistant.

Business: ${input.business.name} (${input.business.industry})
AI Tool Description: ${input.business.aiToolDescription}
Drift Event:
  - Root Cause: ${input.driftEvent.rootCause}
  - Severity: ${input.driftEvent.severity}
  - Quality dropped from ${input.driftEvent.baselineScore} to ${input.driftEvent.currentScore} (${input.driftEvent.dropPercentage}% drop)

Sample of recent problematic conversations:
${input.recentLogs
  .slice(0, 3)
  .map(
    (log, i) =>
      `[${i + 1}] User said: "${log.userMessage.slice(0, 120)}"
       AI responded: "${log.aiResponse.slice(0, 200)}"`
  )
  .join('\n\n')}

Generate 3 specific, prioritized recommendations to fix this drift. Each must be concrete and actionable by a non-technical small business owner.

Respond ONLY with valid JSON array:
[
  {
    "priority": "high|medium|low|critical",
    "category": "prompt|knowledge_base|model_config|escalation_rule|monitoring",
    "title": "<short action title>",
    "description": "<what the problem is and why this fix works, 2 sentences max>",
    "actionSteps": ["<step 1>", "<step 2>", "<step 3>"],
    "estimatedImpact": "<expected quality improvement, e.g. +15 points in 48 hours>",
    "autoApplicable": <true if Tryda can apply this automatically, false if human action needed>
  }
]
`;

export async function runRecommendationEngine(
  input: RecommendationAgentInput
): Promise<Recommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent(RECOMMENDATION_PROMPT(input));
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return parsed.map((r: Omit<Recommendation, 'id' | 'driftEventId' | 'businessId' | 'createdAt' | 'applied'>) => ({
      id: uuidv4(),
      driftEventId: input.driftEvent.id,
      businessId: input.business.id,
      createdAt: new Date().toISOString(),
      ...r,
      applied: false,
    }));
  } catch (err) {
    console.error('Recommendation generation failed:', err);
    // Fallback recommendation when Gemini fails
    return [
      {
        id: uuidv4(),
        driftEventId: input.driftEvent.id,
        businessId: input.business.id,
        createdAt: new Date().toISOString(),
        priority: 'high',
        category: 'monitoring',
        title: 'Manual Review Required',
        description:
          'Automatic diagnosis could not complete. A significant quality drop has been detected that needs immediate human review.',
        actionSteps: [
          'Review the flagged conversations in your Tryda dashboard',
          'Check your AI tool provider for any recent model or service updates',
          'Contact Tryda support if the issue persists',
        ],
        estimatedImpact: 'Depends on root cause identified during manual review',
        autoApplicable: false,
        applied: false,
      },
    ];
  }
}
