import 'dotenv/config';
import { initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const KEY_PATH = '/home/ajayidamilarefelix/Tryda/backend/tryda-firebase-key.json';

try {
  initializeApp({
    credential: cert(KEY_PATH),
    projectId: 'tryda-app',
  });
} catch {
  // Already initialized
}

const db = getFirestore();

const DEMO_LEADS = [
  {
    companyName: 'OmniCall AI',
    websiteUrl: 'https://omnicall-support-demo.com',
    contactName: 'James Carter',
    contactEmail: 'james.carter@omnicall-support.com',
    industry: 'Customer Support & Telephony',
    description: 'An AI voice and text platform handling 24/7 client dispatching and service desk routing.',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    companyName: 'HiredFast AI',
    websiteUrl: 'https://hiredfast-recruiting.com',
    contactName: 'Amanda Vance',
    contactEmail: 'amanda.vance@hiredfast.com',
    industry: 'Human Resources & Recruitment',
    description: 'An automated ATS platform that screens resumes, vets candidate qualifications, and schedules final-round interviews.',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    companyName: 'CartFlow AI',
    websiteUrl: 'https://cartflow-commerce.com',
    contactName: 'Daniel Kim',
    contactEmail: 'daniel.kim@cartflow-commerce.com',
    industry: 'E-commerce & Retail',
    description: 'An AI chatbot assisting Shopify stores with post-purchase order tracking, cancellations, and custom product recommendations.',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

async function seed() {
  console.log('Clearing old lead queue documents...');
  const oldQueue = await db.collection('lead_queue').get();
  const batch = db.batch();
  oldQueue.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  console.log('Seeding fresh pending leads into lead_queue...');
  for (const lead of DEMO_LEADS) {
    const id = db.collection('lead_queue').doc().id;
    await db.collection('lead_queue').doc(id).set(lead);
    console.log(`- Seeded: ${lead.companyName} (${lead.industry})`);
  }
  console.log('\nSeeding complete! Lead queue is ready for Tryda-Agent.');
}

seed().catch(console.error);
