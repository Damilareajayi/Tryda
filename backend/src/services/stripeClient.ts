import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const TIER_PRICE_IDS: Record<string, string> = {
  individual: process.env.STRIPE_PRICE_INDIVIDUAL!,
  enterprise_team: process.env.STRIPE_PRICE_ENTERPRISE_TEAM!,
  enterprise_business: process.env.STRIPE_PRICE_ENTERPRISE_BUSINESS!,
};

export const TIER_CONVERSATION_LIMITS: Record<string, number> = {
  free: 100,
  individual: 1000,
  enterprise_team: 10000,
  enterprise_business: 1000000,
};
