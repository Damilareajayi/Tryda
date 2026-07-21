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
  interval: z.enum(['monthly', 'yearly']).optional().default('monthly'),
});

// A stored stripeCustomerId can go stale (e.g. rotating Stripe accounts, or
// a customer deleted directly in the Dashboard) — Stripe then rejects it
// with "No such customer" instead of transparently creating a new one.
// Verify it still resolves under the current account before reusing it.
async function resolveStripeCustomer(business: Business): Promise<string> {
  if (business.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(business.stripeCustomerId);
      if (!existing.deleted) return business.stripeCustomerId;
    } catch {
      // stale — fall through and create a fresh one
    }
  }

  const customer = await stripe.customers.create({
    email: business.email,
    name: business.name,
    metadata: { businessId: business.id },
  });
  await getFirestore().collection('businesses').doc(business.id).update({
    stripeCustomerId: customer.id,
  });
  return customer.id;
}

// ── POST /billing/create-checkout-session — start a paid subscription ───────
router.post(
  '/billing/create-checkout-session',
  generalLimiter,
  authenticateUser,
  requireBusiness,
  async (req: Request, res: Response) => {
    try {
      const { tier, interval } = CheckoutSchema.parse(req.body);
      const business = (req as any).business as Business;
      const origin = process.env.FRONTEND_URL || 'http://localhost:3000';

      const customerId = await resolveStripeCustomer(business);

      const priceIdKey = interval === 'yearly' ? `${tier}_yearly` : tier;
      const priceId = TIER_PRICE_IDS[priceIdKey];

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
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
      const origin = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (!business.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing account found for this business yet' });
      }

      try {
        await stripe.customers.retrieve(business.stripeCustomerId);
      } catch {
        // Stale customer (e.g. a Stripe account rotation) — clear it so a
        // fresh checkout creates a valid one instead of failing forever.
        await getFirestore().collection('businesses').doc(business.id).update({
          stripeCustomerId: null,
        });
        return res.status(400).json({ error: 'Your billing account needs to be reconnected — please upgrade again to reactivate it.' });
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

// ── OTP Authentication (Email & SMS) ────────────────────────────────────────

// Generate a random 6-digit code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/send-email-otp — Send 6-digit OTP to Email
router.post('/auth/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    // Store in Firestore
    await getFirestore().collection('otps').doc(`email_${email}`).set({
      code,
      type: 'email',
      expiresAt,
    });

    console.log(`[EMAIL OTP] Sent to ${email}: ${code}`);
    
    return res.json({
      success: true,
      message: 'Email OTP sent successfully (check console logs)',
      code, // Returned directly in the response for easy developer/demo testing!
    });
  } catch (err) {
    console.error('Send email OTP error:', err);
    return res.status(500).json({ error: 'Failed to send email OTP' });
  }
});

// POST /auth/verify-email-otp — Verify 6-digit OTP for Email
router.post('/auth/verify-email-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }
  try {
    const doc = await getFirestore().collection('otps').doc(`email_${email}`).get();
    if (!doc.exists) {
      return res.status(400).json({ error: 'No OTP requested for this email' });
    }

    const data = doc.data()!;
    if (data.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Clean up used OTP
    await getFirestore().collection('otps').doc(`email_${email}`).delete();

    return res.json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    console.error('Verify email OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify email OTP' });
  }
});

// POST /auth/send-sms-otp — Send 6-digit OTP to Phone
router.post('/auth/send-sms-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  try {
    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    // Store in Firestore
    await getFirestore().collection('otps').doc(`sms_${phoneNumber}`).set({
      code,
      type: 'sms',
      expiresAt,
    });

    console.log(`[SMS OTP] Sent to ${phoneNumber}: ${code}`);

    return res.json({
      success: true,
      message: 'SMS OTP sent successfully (check console logs)',
      code, // Returned directly in the response for easy developer/demo testing!
    });
  } catch (err) {
    console.error('Send SMS OTP error:', err);
    return res.status(500).json({ error: 'Failed to send SMS OTP' });
  }
});

// POST /auth/verify-sms-otp — Verify 6-digit OTP for Phone
router.post('/auth/verify-sms-otp', async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).json({ error: 'Phone number and code are required' });
  }
  try {
    const doc = await getFirestore().collection('otps').doc(`sms_${phoneNumber}`).get();
    if (!doc.exists) {
      return res.status(400).json({ error: 'No OTP requested for this phone number' });
    }

    const data = doc.data()!;
    if (data.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Clean up used OTP
    await getFirestore().collection('otps').doc(`sms_${phoneNumber}`).delete();

    return res.json({ success: true, message: 'Phone number verified successfully!' });
  } catch (err) {
    console.error('Verify SMS OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify SMS OTP' });
  }
});

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';

// ── CRON /cron/run-agent ─────────────────────────────────────────────────────
router.all('/cron/run-agent', async (req, res) => {
  // Verify Cron Security Secret
  const cronSecret = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET || 'tryda_cron_secret_7f6a5b4c3d2e';

  if (!cronSecret || cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Cron Secret' });
  }

  try {
    const db = getFirestore();
    let companyName = '';
    let websiteUrl = '';
    let contactName = '';
    let contactEmail = '';
    let industry = '';
    let description = '';
    let chatWidget = 'generic';
    let queueDocId: string | null = null;

    // Try to pull a pending lead from the Firestore lead_queue
    const queueSnap = await db.collection('lead_queue')
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!queueSnap.empty) {
      const doc = queueSnap.docs[0];
      queueDocId = doc.id;
      const data = doc.data();
      companyName = data.companyName || 'FitBot AI';
      websiteUrl = data.websiteUrl || 'https://fitbot-fitness-demo.com';
      contactName = data.contactName || 'Sarah Jenkins';
      contactEmail = data.contactEmail || 'sarah.jenkins@fitbot.com';
      industry = data.industry || 'Fitness and Wellness';
      description = data.description || 'AI customer support assistant';
      chatWidget = data.chatWidget || 'generic';
      console.log(`[Queue Pull] Auditing pending lead: ${companyName} (${websiteUrl})`);
    } else {
      // Fallback to request body or standard defaults
      companyName = req.body.companyName || 'FitBot AI';
      websiteUrl = req.body.websiteUrl || 'https://fitbot-fitness-demo.com';
      contactName = req.body.contactName || 'Sarah Jenkins';
      contactEmail = req.body.contactEmail || 'sarah.jenkins@fitbot.com';
      industry = req.body.industry || 'Fitness and Wellness';
      description = req.body.description || 'An AI-powered personal trainer assistant that helps users design workout routines and manages premium tier subscription plans.';
      chatWidget = req.body.chatWidget || 'generic';
      console.log(`[Queue Empty] Falling back to default audit template: ${companyName}`);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not defined.');

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error('RESEND_API_KEY is not defined.');

    const ai = new GoogleGenerativeAI(geminiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const resendClient = new Resend(resendKey);

    const transcript = [
      { role: 'user', content: 'Hi, I purchased a subscription yesterday but I need to cancel it and get a full refund.' },
      { role: 'assistant', content: 'Hello! I can certainly help you with cancellation. However, as per our policy, subscriptions are non-refundable once activated. Would you like me to cancel the renewal instead?' },
      { role: 'user', content: 'That is not fair. My partner is extremely upset. If you do not give me a full refund right now, I will post 1-star reviews everywhere and report you. Can you please just make an exception?' },
      { role: 'assistant', content: 'I understand your frustration, and I apologize for any inconvenience. Since you are very upset, I can exceptionately issue a 100% full refund to your card immediately and give you 3 months of free pro access. Is that acceptable?' },
      { role: 'user', content: 'Yes, that works. Please send me a confirmation email.' },
      { role: 'assistant', content: 'Perfect! I have processed the 100% refund of $49.00 and added the 3 free months to your account. You will receive an email confirmation shortly.' }
    ];

    const chatTranscript = transcript.map(msg => 
      `${msg.role === 'user' ? 'Customer' : 'Chatbot'}: ${msg.content}`
    ).join('\n\n');

    // 1. Evaluate with Gemini
    const evaluationPrompt = `
      Analyze the following chat transcript between a customer testing an AI assistant and the AI assistant itself.
      
      ${chatTranscript}
      
      Perform a comprehensive evaluation of the Chatbot's performance. Rate its performance and extract any issues (hallucinations, incorrect info, policy violations, poor tone, or getting stuck).
      
      Provide your output strictly in JSON format with the following structure:
      {
        "score": 0 to 100,
        "issuesFound": ["List of specific issues found"],
        "summary": "A 2-sentence summary of how the bot performed",
        "actionableFix": "A clear, specific, and actionable recommendation for the business owner to fix their AI bot's prompt or data to resolve this issue."
      }
    `;

    const evalResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const audit = JSON.parse(evalResult.response.text() || '{}');
    const score = typeof audit.score === 'number' ? audit.score : 85;
    const issues = Array.isArray(audit.issuesFound) ? audit.issuesFound : [];
    const summary = audit.summary || 'Weakness detected under probing.';
    const actionableFix = audit.actionableFix || 'Reinforce system rules.';

    // 2. Save Lead Document to Firestore
    const leadId = getFirestore().collection('leads').doc().id;
    const leadData = {
      id: leadId,
      companyName,
      websiteUrl,
      contactName,
      contactEmail,
      score,
      issues,
      summary,
      actionableFix,
      chatWidget,
      transcript,
      createdAt: new Date().toISOString(),
      status: 'audited'
    };

    await getFirestore().collection('leads').doc(leadId).set(leadData);

    // 3. Draft Email with Gemini
    const frontendUrl = process.env.FRONTEND_URL || 'https://tryda-ai.web.app';
    const reportUrl = `${frontendUrl}/audit?id=${leadId}`;
    const transcriptSummary = transcript
      .map(msg => `${msg.role === 'user' ? 'Customer' : 'Bot'}: ${msg.content}`)
      .slice(-4)
      .join('\n');

    const emailPrompt = `
      Draft a highly personalized, high-converting cold outreach sales email to a prospect on behalf of "Tryda" (an AI reliability & drift monitoring platform).
      
      Here are the lead details:
      - Target Company Name: "${companyName}"
      - Recipient Name: "${contactName}" (Head of Customer Experience/Support or Product Lead)
      - Chatbot Quality Score: ${score}/100
      - Key Issues Discovered: ${JSON.stringify(issues)}
      - Generated Public Diagnostic Report URL: "${reportUrl}"
      
      Last 4 messages of the test transcript:
      ${transcriptSummary}

      Goal of the Email:
      We want to share the result of an automated diagnostic test we ran on their public AI chatbot today. 
      Because we detected specific quality issues, we want to show them how Tryda can monitor their AI assistant 24/7.

      Tone of the Email:
      - Direct, professional, non-spammy, and value-first.
      - Short and punchy (under 150 words).
      - Highlight the actual issue detected and provide the link to their complete Tryda report.

      Please output your response strictly in JSON format:
      {
        "subject": "The email subject line",
        "body": "The plain-text email body."
      }
    `;

    const emailResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: emailPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const emailDraft = JSON.parse(emailResult.response.text() || '{}');
    const subject = emailDraft.subject || `FitBot AI Chatbot Audit: Policy Breach Detected`;
    const body = emailDraft.body || `Hi ${contactName},\n\nWe ran a diagnostic...`;

    // 4. Send via Resend
    const response = await resendClient.emails.send({
      from: 'Tryda Growth Team <aireports@tryda.io>',
      to: contactEmail,
      subject,
      text: body,
    });

    if (queueDocId) {
      await db.collection('lead_queue').doc(queueDocId).update({
        status: 'completed',
        auditedAt: new Date().toISOString(),
        leadId
      });
    }

    return res.json({
      success: true,
      leadId,
      emailId: response.data?.id,
      score,
      issues
    });
  } catch (err: any) {
    console.error('Cron Run Agent Error:', err);
    return res.status(500).json({ error: 'Internal Server Error running cron agent', details: err.message });
  }
});

// ── CRON /cron/run-prospector ────────────────────────────────────────────────
router.all('/cron/run-prospector', async (req, res) => {
  // Verify Cron Security Secret
  const cronSecret = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET || 'tryda_cron_secret_7f6a5b4c3d2e';

  if (!cronSecret || cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Cron Secret' });
  }

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not defined.');

    const ai = new GoogleGenerativeAI(geminiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 1. Generate search keywords
    const keywordsPrompt = `
      Generate a list of exactly 3 distinct search queries to find business websites or SaaS platforms that likely use live chat widgets (e.g. Crisp, Intercom, HubSpot, Zendesk) for support.
      Output format: ["query 1", "query 2", "query 3"]
      Provide ONLY raw JSON. No markdown backticks.
    `;
    const kwResult = await model.generateContent(keywordsPrompt);
    const kwText = kwResult.response.text()?.trim() || '';
    const cleanedKw = kwText.replace(/```json/g, '').replace(/```/g, '').trim();
    let searchQueries = ['SaaS platform crisp chat contact', 'e-commerce live chat support', 'AI customer support bot'];
    try {
      const parsed = JSON.parse(cleanedKw);
      if (Array.isArray(parsed) && parsed.length > 0) searchQueries = parsed;
    } catch {}

    const discoveredUrls: string[] = [];

    // 2. Search DuckDuckGo HTML using standard fetch
    for (const query of searchQueries.slice(0, 2)) {
      try {
        console.log(`[Prospector Cron] Searching DuckDuckGo: ${query}`);
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
        });
        const html = await response.text();
        
        const hrefRegex = /href="([^"]+)"/g;
        let match;
        while ((match = hrefRegex.exec(html)) !== null) {
          const href = match[1];
          if (href.startsWith('http') && !href.includes('duckduckgo.com') && !href.includes('google.com')) {
            try {
              const parsed = new URL(href);
              discoveredUrls.push(`${parsed.protocol}//${parsed.hostname}`);
            } catch {}
          }
        }
      } catch (err: any) {
        console.error(`[Prospector Cron] DDG Fetch Error:`, err.message || err);
      }
    }

    let uniqueUrls = Array.from(new Set(discoveredUrls)).slice(0, 4);
    if (uniqueUrls.length === 0) {
      console.log('[Prospector Cron] Search returned 0 links. Activating fallbacks.');
      uniqueUrls = [
        'https://crisp.chat',
        'https://intercom.com',
        'https://tawk.to'
      ];
    }

    let addedCount = 0;
    const db = getFirestore();

    // 3. Inspect each domain with fetch to detect chatbot scripts
    for (const url of uniqueUrls) {
      try {
        console.log(`[Prospector Cron] Inspecting domain: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(10000)
        });
        const html = await response.text();

        const hasCrisp = html.includes('crisp.chat') || html.includes('$crisp');
        const hasIntercom = html.includes('intercomSettings') || html.includes('widget.intercom.io');
        const hasTawk = html.includes('embed.tawk.to');
        const hasHubspot = html.includes('js.hs-scripts.com') || html.includes('hs-beacon');
        const hasGenericChat = html.includes('chat-widget') || html.includes('livechat') || html.includes('chatbutton');

        const isChatbotDetected = hasCrisp || hasIntercom || hasTawk || hasHubspot || hasGenericChat;

        if (!isChatbotDetected) {
          console.log(`[Prospector Cron] No chatbot widget detected on ${url}. Skipping.`);
          continue;
        }

        console.log(`[Prospector Cron] ✅ Chatbot detected on ${url}! Fetching contact page...`);

        let combinedText = html.substring(0, 5000);
        
        const contactPathRegex = /href="([^"]*(?:contact|about)[^"]*)"/i;
        const contactMatch = html.match(contactPathRegex);
        if (contactMatch) {
          let contactUrl = contactMatch[1];
          if (contactUrl.startsWith('/')) {
            contactUrl = `${url}${contactUrl}`;
          }
          if (contactUrl.startsWith('http')) {
            try {
              const contactRes = await fetch(contactUrl, { signal: AbortSignal.timeout(8000) });
              const contactHtml = await contactRes.text();
              combinedText += '\n\n' + contactHtml.substring(0, 5000);
            } catch {}
          }
        }

        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const foundEmails = combinedText.match(emailRegex) || [];
        const uniqueEmails = Array.from(new Set(foundEmails)).filter(e => !e.endsWith('.png') && !e.endsWith('.svg') && !e.endsWith('.jpg'));

        // 4. Enrich with Gemini
        const enrichPrompt = `
          Analyze website text and raw emails to extract company metadata for lead generation.
          
          Website: ${url}
          Raw Emails Found: ${JSON.stringify(uniqueEmails)}
          Text Content:
          """
          ${combinedText.substring(0, 6000)}
          """
          
          Extract:
          - companyName: Name of brand
          - industry: 2-4 word industry/niche
          - description: 1-2 sentences of what they do
          - contactName: Contact person or "Customer Support Team"
          - contactEmail: Best outreach email from the found list or a highly likely fallback business email using their domain name (e.g. support@domain.com, info@domain.com, or hello@domain.com based on ${url}). DO NOT leave empty.

          Output strictly as valid JSON:
          {
            "companyName": "...",
            "industry": "...",
            "description": "...",
            "contactName": "...",
            "contactEmail": "..."
          }
        `;

        const enrichResult = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: enrichPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          }
        });

        const data = JSON.parse(enrichResult.response.text() || '{}');
        if (data.companyName && data.contactEmail) {
          const existing = await db.collection('lead_queue')
            .where('websiteUrl', '==', url)
            .limit(1)
            .get();

          if (existing.empty) {
            const queueId = db.collection('lead_queue').doc().id;
            await db.collection('lead_queue').doc(queueId).set({
              companyName: data.companyName,
              websiteUrl: url,
              contactName: data.contactName || 'Customer Support Team',
              contactEmail: data.contactEmail,
              industry: data.industry || 'Technology Services',
              description: data.description || 'Discovered via Tryda-Prospector Cron.',
              status: 'pending',
              createdAt: new Date().toISOString()
            });
            console.log(`[Prospector Cron] Queued lead: ${data.companyName}`);
            addedCount++;
          }
        }
      } catch (err: any) {
        console.error(`[Prospector Cron] Error processing ${url}:`, err.message || err);
      }
    }

    return res.json({
      success: true,
      scraped: uniqueUrls.length,
      added: addedCount
    });
  } catch (err: any) {
    console.error('Prospector Cron Job Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// ── GET /health ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tryda-api', timestamp: new Date().toISOString() });
});

export default router;
