import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { stripe, TIER_CONVERSATION_LIMITS, TIER_PRICE_IDS } from '../services/stripeClient';

function tierForPriceId(priceId: string | undefined): string | undefined {
  const matchedKey = Object.entries(TIER_PRICE_IDS).find(([, id]) => id === priceId)?.[0];
  if (!matchedKey) return undefined;
  return matchedKey.replace('_yearly', '');
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw Buffer — must not be JSON-parsed upstream
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return res.status(400).send('Webhook signature verification failed');
  }

  const db = getFirestore();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.businessId;
        const tier = session.metadata?.tier;
        if (!businessId || !tier) break;

        await db.collection('businesses').doc(businessId).update({
          subscriptionTier: tier,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          monthlyConversationLimit: TIER_CONVERSATION_LIMITS[tier] ?? 100,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status !== 'active') break;

        const tier = tierForPriceId(subscription.items.data[0]?.price.id);
        if (!tier) break;

        const snap = await db
          .collection('businesses')
          .where('stripeSubscriptionId', '==', subscription.id)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            subscriptionTier: tier,
            monthlyConversationLimit: TIER_CONVERSATION_LIMITS[tier] ?? 100,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const snap = await db
          .collection('businesses')
          .where('stripeSubscriptionId', '==', subscription.id)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            subscriptionTier: 'free',
            stripeSubscriptionId: null,
            monthlyConversationLimit: TIER_CONVERSATION_LIMITS.free,
          });
        }
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handling error:', err);
    return res.status(500).json({ error: 'Webhook handling failed' });
  }
}
