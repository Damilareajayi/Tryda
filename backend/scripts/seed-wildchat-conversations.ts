const API_URL = process.env.API_URL || 'http://localhost:8080';
const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: ts-node scripts/seed-wildchat-conversations.ts <apiKey>');
  process.exit(1);
}

const candidates = require('./wildchat-candidates.json') as Array<{
  hash: string; model: string; user: string; asst: string;
}>;

// Pick 8 diverse, clean, single-turn real conversations from WildChat-1M
const PICKS = [0, 1, 2, 4, 5, 6, 8, 9];

function log(i: number, c: (typeof candidates)[number], hoursAgo: number) {
  return {
    sessionId: c.hash,
    timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    userMessage: c.user.slice(0, 5000),
    aiResponse: c.asst.slice(0, 10000),
    metadata: { channel: 'chat', model: c.model, latencyMs: 400 + Math.floor(Math.random() * 600) },
  };
}

async function main() {
  const logs = PICKS.map((idx, i) => log(idx, candidates[idx], PICKS.length - i));
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ logs }),
  });
  const body = await res.json();
  console.log(`status ${res.status}:`, body);
}

main();