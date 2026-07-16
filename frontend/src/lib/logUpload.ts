import Papa from 'papaparse';

export interface UploadLog {
  sessionId: string;
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  metadata?: {
    model?: string;
    latencyMs?: number;
    tokensUsed?: number;
    channel?: string;
  };
}

export interface ParseResult {
  logs: UploadLog[];
  skipped: number;
}

// Mirrors the backend's LogSchema (backend/src/routes/index.ts) so rows that
// would fail server-side validation are dropped before they're even sent.
function isValidLog(raw: any): raw is UploadLog {
  return (
    typeof raw?.sessionId === 'string' && raw.sessionId.length > 0 &&
    typeof raw?.timestamp === 'string' && raw.timestamp.length > 0 &&
    typeof raw?.userMessage === 'string' && raw.userMessage.length > 0 && raw.userMessage.length <= 5000 &&
    typeof raw?.aiResponse === 'string' && raw.aiResponse.length > 0 && raw.aiResponse.length <= 10000
  );
}

export async function parseLogFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const isJson = file.name.toLowerCase().endsWith('.json');

  const rawRows: any[] = isJson
    ? JSON.parse(text)
    : (Papa.parse(text, { header: true, skipEmptyLines: true }).data as any[]);

  const logs: UploadLog[] = [];
  let skipped = 0;

  for (const row of rawRows) {
    const candidate: UploadLog = isJson
      ? row
      : {
          sessionId: row.sessionId,
          timestamp: row.timestamp,
          userMessage: row.userMessage,
          aiResponse: row.aiResponse,
          metadata: {
            model: row.model || undefined,
            latencyMs: row.latencyMs ? Number(row.latencyMs) : undefined,
            tokensUsed: row.tokensUsed ? Number(row.tokensUsed) : undefined,
            channel: row.channel || undefined,
          },
        };

    if (isValidLog(candidate)) {
      logs.push(candidate);
    } else {
      skipped++;
    }
  }

  return { logs, skipped };
}

export const SAMPLE_CSV = `sessionId,timestamp,userMessage,aiResponse,model,latencyMs,tokensUsed,channel
session-001,2026-07-16T10:00:00Z,What are your shipping rates?,We offer free shipping on orders over $50,gpt-4,340,120,chat
session-002,2026-07-16T10:05:00Z,Can I return an item after 30 days?,Our return window is 30 days from delivery,gpt-4,290,98,chat
`;
