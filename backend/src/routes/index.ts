import { Router, Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { runMonitoringPipeline } from '../services/monitoringPipeline';
import { runReportingEngine } from '../agents/reportingEngine';
import { ConversationLog, Business } from '../types';

const router = Router();

// Strict rate limit on AI-heavy endpoints
const aiLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const generalLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// ── Auth middleware ─────────────────────────────────────────────────────────
async function authenticateBusiness(
  req: Request,
  res: Response,
  next: Function
) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const snap = await getFirestore()
    .collection('businesses')
    .where('apiKey', '==', apiKey)
    .limit(1)
    .get();

  if (snap.empty) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  (req as any).business = snap.docs[0].data() as Business;
  next();
}

// ── Validation schemas ──────────────────────────────────────────────────────
const LogSchema = z.object({
  sessionId: z.string(),
  timestamp: z.string(),
  userMessage: z.string().min(1).max(5000),
  aiResponse: z.string().min(1).max(10000),
  metadata: z
    .object({
      model: z.string().optional(),
      latencyMs: z.number().optional(),
      tokensUsed: z.number().optional(),
      channel: z.string().optional(),
    })
    .optional(),
});

const IngestSchema = z.object({
  logs: z.array(LogSchema).min(1).max(100),
});

// ── POST /ingest — Submit conversation logs for monitoring ──────────────────
router.post(
  '/ingest',
  generalLimiter,
  authenticateBusiness,
  async (req: Request, res: Response) => {
    try {
      const { logs } = IngestSchema.parse(req.body);
      const business = (req as any).business as Business;

      const conversationLogs: ConversationLog[] = logs.map((log, i) => ({
        id: `${business.id}-${Date.now()}-${i}`,
        businessId: business.id,
        ...log,
      }));

      const result = await runMonitoringPipeline(business, conversationLogs);
      return res.json(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid payload', details: err.errors });
      }
      console.error('Ingest error:', err);
      return res.status(500).json({ error: 'Monitoring pipeline failed' });
    }
  }
);

// ── GET /report — Generate performance report ───────────────────────────────
router.get(
  '/report',
  aiLimiter,
  authenticateBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const days = Math.min(parseInt(req.query.days as string) || 7, 30);
      const report = await runReportingEngine(business.id, days);
      return res.json(report);
    } catch (err) {
      console.error('Report error:', err);
      return res.status(500).json({ error: 'Report generation failed' });
    }
  }
);

// ── GET /drift-events — List drift events ───────────────────────────────────
router.get(
  '/drift-events',
  generalLimiter,
  authenticateBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const snap = await getFirestore()
        .collection('driftEvents')
        .where('businessId', '==', business.id)
        .orderBy('detectedAt', 'desc')
        .limit(20)
        .get();

      return res.json(snap.docs.map((d) => d.data()));
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch drift events' });
    }
  }
);

// ── GET /recommendations — List open recommendations ────────────────────────
router.get(
  '/recommendations',
  generalLimiter,
  authenticateBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const snap = await getFirestore()
        .collection('recommendations')
        .where('businessId', '==', business.id)
        .where('applied', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      return res.json(snap.docs.map((d) => d.data()));
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }
);

// ── PATCH /recommendations/:id/apply — Mark recommendation as applied ───────
router.patch(
  '/recommendations/:id/apply',
  generalLimiter,
  authenticateBusiness,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await getFirestore().collection('recommendations').doc(id).update({
        applied: true,
        appliedAt: new Date().toISOString(),
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to apply recommendation' });
    }
  }
);

// ── GET /health ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tryda-api', timestamp: new Date().toISOString() });
});

export default router;
