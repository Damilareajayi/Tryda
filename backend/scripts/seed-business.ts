import 'dotenv/config';
import { v4 as uuid } from 'uuid';
import { initFirebase } from '../src/services/firebase';
import { Business } from '../src/types';

async function main() {
  const db = initFirebase();

  const business: Business = {
    id: uuid(),
    name: 'Demo Business',
    email: 'ajayidamilarefelix@gmail.com',
    industry: 'E-commerce',
    aiToolDescription: 'Custom GPT-powered support widget handling shipping, returns, and product questions.',
    apiKey: `dl_live_${uuid().replace(/-/g, '')}`,
    createdAt: new Date().toISOString(),
    subscriptionTier: 'free',
    monthlyConversationLimit: 1000,
    currentMonthCount: 0,
  };

  await db.collection('businesses').doc(business.id).set(business);

  console.log('Seeded business:');
  console.log(`  businessId: ${business.id}`);
  console.log(`  apiKey:     ${business.apiKey}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
