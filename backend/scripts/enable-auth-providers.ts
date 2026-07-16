import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const KEY_PATH = 'c:/Users/dfa24/tryda/tryda-app-firebase-adminsdk-fbsvc-a207d0db7d.json';

async function main() {
  const auth = new GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Enable email/password sign-in
  const emailRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
    }
  );
  console.log('Email/password status:', emailRes.status, await emailRes.text());

  // Enable Google sign-in
  const googleRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs?idpId=google.com`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled: true }),
    }
  );
  console.log('Google status:', googleRes.status, await googleRes.text());
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});