import 'dotenv/config';
import { initFirebase } from '../src/services/firebase';

async function main() {
  const db = initFirebase();
  const snap = await db.collection('businesses').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.subscriptionTier === 'starter' || data.subscriptionTier === 'growth' || data.subscriptionTier === 'scale') {
      await doc.ref.update({ subscriptionTier: 'free' });
      console.log(`Migrated ${doc.id}: ${data.subscriptionTier} -> free`);
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
