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

  // List existing web apps
  const listRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`, { headers });
  const listBody = await listRes.json();
  console.log('List status:', listRes.status, JSON.stringify(listBody));

  let appId: string;
  if (listBody.apps && listBody.apps.length > 0) {
    appId = listBody.apps[0].appId;
    console.log('Using existing web app:', appId);
  } else {
    const createRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ displayName: 'Tryda Web' }),
    });
    const createBody = await createRes.json();
    console.log('Create status:', createRes.status, JSON.stringify(createBody));
    if (createRes.status >= 400) return;
    // This returns a long-running operation; poll it
    const opName = createBody.name;
    let done = false;
    let result;
    for (let i = 0; i < 10 && !done; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const opRes = await fetch(`https://firebase.googleapis.com/v1beta1/${opName}`, { headers });
      const opBody = await opRes.json();
      done = opBody.done;
      result = opBody.response;
    }
    if (!result) {
      console.log('Timed out waiting for web app creation');
      return;
    }
    appId = result.appId;
    console.log('Created web app:', appId);
  }

  const configRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${appId}/config`,
    { headers }
  );
  const config = await configRes.json();
  console.log('Config status:', configRes.status);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});