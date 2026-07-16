import { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Business } from '../types';

// Authenticates a logged-in dashboard user via a Firebase ID token and
// attaches their Business record. Distinct from authenticateBusiness (which
// uses a long-lived x-api-key for server-to-server log ingestion).
export async function authenticateUser(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(header.slice('Bearer '.length));
    (req as any).uid = decoded.uid;
    (req as any).userEmail = decoded.email;

    const snap = await getFirestore()
      .collection('businesses')
      .where('uid', '==', decoded.uid)
      .limit(1)
      .get();

    if (!snap.empty) {
      (req as any).business = snap.docs[0].data() as Business;
      (req as any).businessRef = snap.docs[0].ref;
    }

    next();
  } catch (err) {
    console.error('Auth token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Like authenticateUser, but requires a Business record to already exist
// (used for routes that operate on an established business).
export async function requireBusiness(req: Request, res: Response, next: Function) {
  if (!(req as any).business) {
    return res.status(404).json({ error: 'No business found for this account. Complete signup first.' });
  }
  next();
}