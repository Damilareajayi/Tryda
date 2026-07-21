import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

const KEY_PATH = '/home/ajayidamilarefelix/Tryda/backend/tryda-firebase-key.json';

try {
  admin.initializeApp({
    credential: admin.credential.cert(KEY_PATH),
    projectId: 'tryda-app',
  });
} catch {
  // Already initialized
}

const db = admin.firestore();

async function listLeads() {
  console.log('Querying Firestore lead_queue collection...\n');
  const snap = await db.collection('lead_queue').orderBy('createdAt', 'desc').get();
  
  if (snap.empty) {
    console.log('No leads found in lead_queue.');
    return;
  }

  console.log(`Total Leads in Queue: ${snap.size}\n`);
  
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`=========================================`);
    console.log(`Doc ID:      ${doc.id}`);
    console.log(`Company:     ${data.companyName}`);
    console.log(`Website:     ${data.websiteUrl}`);
    console.log(`Niche:       ${data.industry}`);
    console.log(`Contact:     ${data.contactName} <${data.contactEmail}>`);
    console.log(`Status:      ${data.status}`);
    console.log(`Created At:  ${data.createdAt}`);
    if (data.status === 'completed' && data.leadId) {
      console.log(`Audit ID:    ${data.leadId}`);
      console.log(`Report Link: https://tryda.io/audit?id=${data.leadId}`);
    }
    console.log(`=========================================\n`);
  });
}

listLeads().catch(console.error);
