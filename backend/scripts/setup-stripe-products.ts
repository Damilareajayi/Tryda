import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PLANS = [
  {
    key: 'individual',
    name: 'Tryda Individual',
    description: '1,000 conversations/month, 1 AI tool',
    unitAmount: 1000, // $10.00
  },
  {
    key: 'enterprise_team',
    name: 'Tryda Enterprise — Team',
    description: 'For small teams: higher volume, multiple AI tools, priority support',
    unitAmount: 5000, // $50.00
  },
  {
    key: 'enterprise_business',
    name: 'Tryda Enterprise — Business',
    description: 'For larger orgs: highest volume, unlimited AI tools, dedicated support',
    unitAmount: 10000, // $100.00
  },
];

async function main() {
  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { tryda_tier: plan.key },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.unitAmount,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tryda_tier: plan.key },
    });

    console.log(`${plan.key}: product=${product.id} price=${price.id}`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
