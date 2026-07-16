import { Router, Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { runMonitoringPipeline } from '../services/monitoringPipeline';
import { runReportingEngine } from '../agents/reportingEngine';
import { ConversationLog, Business } from '../types';
import { stripe, TIER_PRICE_IDS, TIER_CONVERSATION_LIMITS } from '../services/stripeClient';
import { authenticateUser, requireBusiness } from '../middleware/auth';

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

// ── POST /auth/provision — ensure a Business exists for the logged-in user ──
// Called right after Firebase sign-up/sign-in. Idempotent: if a Business
// already exists for this uid, returns it as-is; otherwise creates one from
// the supplied profile fields (required for first-time sign-up).
const ProvisionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  industry: z.string().min(1).max(100).optional(),
  aiToolDescription: z.string().min(1).max(500).optional(),
});

router.post(
  '/auth/provision',
  generalLimiter,
  authenticateUser,
  async (req: Request, res: Response) => {
    const existing = (req as any).business as Business | undefined;
    if (existing) {
      return res.json({ business: existing, created: false });
    }

    try {
      const { name, industry, aiToolDescription } = ProvisionSchema.parse(req.body);
      if (!name || !industry || !aiToolDescription) {
        return res.status(400).json({
          error: 'name, industry, and aiToolDescription are required to create a new account',
        });
      }

      const uid = (req as any).uid as string;
      const email = (req as any).userEmail as string;

      const business: Business = {
        id: uuid(),
        uid,
        name,
        email: email || '',
        industry,
        aiToolDescription,
        apiKey: `dl_live_${uuid().replace(/-/g, '')}`,
        createdAt: new Date().toISOString(),
        subscriptionTier: 'free',
        monthlyConversationLimit: 100,
        currentMonthCount: 0,
      };

      await getFirestore().collection('businesses').doc(business.id).set(business);
      return res.json({ business, created: true });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid payload', details: err.errors });
      }
      console.error('Provision error:', err);
      return res.status(500).json({ error: 'Could not provision account' });
    }
  }
);

// ── GET /business — Current business profile + subscription info ───────────
router.get(
  '/business',
  generalLimiter,
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    const business = (req as any).business as Business;
    return res.json({
      id: business.id,
      name: business.name,
      industry: business.industry,
      aiToolDescription: business.aiToolDescription,
      apiKey: business.apiKey,
      subscriptionTier: business.subscriptionTier,
      monthlyConversationLimit: business.monthlyConversationLimit,
      currentMonthCount: business.currentMonthCount,
      hasBillingAccount: Boolean(business.stripeCustomerId),
    });
  }
);

// ── GET /report — Generate performance report ───────────────────────────────
router.get(
  '/report',
  aiLimiter,
  authenticateUser,
  requireBusiness,
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
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const snap = await getFirestore()
        .collection('driftEvents')
        .where('businessId', '==', business.id)
        .get();

      const events = snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.detectedAt as string).localeCompare(a.detectedAt as string))
        .slice(0, 20);

      return res.json(events);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch drift events' });
    }
  }
);

// ── GET /recommendations — List open recommendations ────────────────────────
router.get(
  '/recommendations',
  generalLimiter,
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const snap = await getFirestore()
        .collection('recommendations')
        .where('businessId', '==', business.id)
        .where('applied', '==', false)
        .get();

      const recs = snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string))
        .slice(0, 10);

      return res.json(recs);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }
);

// ── PATCH /recommendations/:id/apply — Mark recommendation as applied ───────
router.patch(
  '/recommendations/:id/apply',
  generalLimiter,
  authenticateUser,
  requireBusiness,
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

// ── Billing ──────────────────────────────────────────────────────────────────
const CheckoutSchema = z.object({
  tier: z.enum(['individual', 'enterprise_team', 'enterprise_business']),
});

// ── POST /billing/create-checkout-session — start a paid subscription ───────
router.post(
  '/billing/create-checkout-session',
  generalLimiter,
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    try {
      const { tier } = CheckoutSchema.parse(req.body);
      const business = (req as any).business as Business;
      const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:3001';

      let customerId = business.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: business.email,
          name: business.name,
          metadata: { businessId: business.id },
        });
        customerId = customer.id;
        await getFirestore().collection('businesses').doc(business.id).update({
          stripeCustomerId: customerId,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: TIER_PRICE_IDS[tier], quantity: 1 }],
        success_url: `${origin}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/settings?checkout=cancelled`,
        metadata: { businessId: business.id, tier },
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid payload', details: err.errors });
      }
      console.error('Checkout session error:', err);
      return res.status(500).json({ error: 'Could not start checkout' });
    }
  }
);

// ── POST /billing/create-portal-session — manage/cancel existing subscription
router.post(
  '/billing/create-portal-session',
  generalLimiter,
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:3001';

      if (!business.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing account found for this business yet' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: business.stripeCustomerId,
        return_url: `${origin}/settings`,
      });

      return res.json({ url: session.url });
    } catch (err) {
      console.error('Portal session error:', err);
      return res.status(500).json({ error: 'Could not open billing portal' });
    }
  }
);

// ── GET /billing/verify-session — confirm a checkout right after redirect ───
// Complements the webhook (which remains the source of truth for renewals/
// cancellations): gives the settings page immediate confirmation even before
// the webhook has been delivered, without needing a locally-forwarded tunnel.
router.get(
  '/billing/verify-session',
  generalLimiter,
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business as Business;
      const sessionId = req.query.session_id as string;
      if (!sessionId) {
        return res.status(400).json({ error: 'session_id is required' });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.businessId !== business.id) {
        return res.status(403).json({ error: 'Session does not belong to this business' });
      }

      if (session.payment_status !== 'paid') {
        return res.json({ confirmed: false, status: session.payment_status });
      }

      const tier = session.metadata?.tier;
      if (tier) {
        await getFirestore().collection('businesses').doc(business.id).update({
          subscriptionTier: tier,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          monthlyConversationLimit: TIER_CONVERSATION_LIMITS[tier] ?? 100,
        });
      }

      return res.json({ confirmed: true, tier });
    } catch (err) {
      console.error('Verify session error:', err);
      return res.status(500).json({ error: 'Could not verify checkout session' });
    }
  }
);

// ── GET /health ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tryda-api', timestamp: new Date().toISOString() });
});

export default router;
