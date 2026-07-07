import 'dotenv/config';
import { initFirebase } from '../src/services/firebase';

const businessId = process.argv[2];

async function main() {
  const db = initFirebase();
  const collections = ['qualityScores', 'baselines', 'driftEvents', 'recommendations'];

  for (const coll of collections) {
    const snap = await db.collection(coll).where('businessId', '==', businessId).get();
    console.log(`${coll}: ${snap.docs.length} docs`);
    snap.docs.forEach((d) => console.log('  ', JSON.stringify(d.data()).slice(0, 200)));
  }

  const baselineDoc = await db.collection('baselines').doc(businessId).get();
  console.log('baseline doc (by id):', baselineDoc.exists ? JSON.stringify(baselineDoc.data()) : 'none');
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
