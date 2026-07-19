import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const KEY_PATH = '/home/ajayidamilarefelix/Tryda/backend/tryda-firebase-key.json';

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

  // Add Authorized Domains for localhost and Cloud Shell
  const configRes = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`, { headers });
  const currentConfig = await configRes.json() as any;
  const currentDomains = currentConfig.authorizedDomains || [];
  
  const domainsToAdd = [
    'localhost',
    'cs-502792439864-default.cs-us-east1-yeah.cloudshell.dev',
    '3000-cs-502792439864-default.cs-us-east1-yeah.cloudshell.dev',
    'tryda-frontend-109857244258.us-central1.run.app',
    'tryda-ai.web.app',
    'tryda-ai.firebaseapp.com'
  ];

  const updatedDomains = Array.from(new Set([...currentDomains, ...domainsToAdd]));

  console.log('Updating authorized domains to:', updatedDomains);

  const domainsRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ authorizedDomains: updatedDomains }),
    }
  );
  console.log('Authorized domains status:', domainsRes.status, await domainsRes.text());
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});