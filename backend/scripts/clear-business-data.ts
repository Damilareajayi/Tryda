import 'dotenv/config';
import { initFirebase } from '../src/services/firebase';

const businessId = process.argv[2];
if (!businessId) {
  console.error('Usage: ts-node scripts/clear-business-data.ts <businessId>');
  process.exit(1);
}

async function main() {
  const db = initFirebase();
  const collections = ['qualityScores', 'baselines', 'driftEvents', 'recommendations'];

  for (const coll of collections) {
    const snap = await db.collection(coll).where('businessId', '==', businessId).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
    console.log(`Cleared ${snap.docs.length} docs from ${coll}`);
  }

  // baselines is keyed by businessId as doc id directly, not a query match on businessId field necessarily
  const baselineDoc = await db.collection('baselines').doc(businessId).get();
  if (baselineDoc.exists) {
    await baselineDoc.ref.delete();
    console.log('Cleared baseline doc');
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
