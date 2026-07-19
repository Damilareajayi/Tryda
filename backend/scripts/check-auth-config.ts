import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const KEY_PATH = '/home/ajayidamilarefelix/Tryda/backend/tryda-firebase-key.json';

async function main() {
  const auth = new GoogleAuth({ keyFile: KEY_PATH, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const headers = { Authorization: `Bearer ${token}` };

  const configRes = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`, { headers });
  console.log('=== Project Auth Config ===');
  console.log(JSON.stringify(await configRes.json(), null, 2));

  const idpRes = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs`, { headers });
  console.log('=== IDP Configs ===');
  console.log(JSON.stringify(await idpRes.json(), null, 2));
}
main().catch((e) => console.error(e));
