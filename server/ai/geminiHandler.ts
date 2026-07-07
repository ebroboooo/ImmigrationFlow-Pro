import type { IncomingMessage, ServerResponse } from 'node:http';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiGenerateRequest {
  model: string;
  prompt: string;
}

export interface GeminiGenerateResponse {
  text: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || undefined;
}

export async function handleGeminiStatus(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiKey = getGeminiApiKey();
  sendJson(res, 200, {
    configured: Boolean(apiKey),
    provider: 'gemini',
  });
}

export async function handleGeminiTest(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    sendJson(res, 503, { success: false, error: 'GEMINI_API_KEY is not set on the server.' });
    return;
  }

  const model = 'gemini-2.0-flash';
  const start = Date.now();
  try {
    const response = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
        generationConfig: { maxOutputTokens: 16 },
      }),
    });
    const latencyMs = Date.now() - start;
    if (!response.ok) {
      const errText = await response.text();
      sendJson(res, response.status, { success: false, error: errText.slice(0, 500), latencyMs });
      return;
    }
    sendJson(res, 200, { success: true, latencyMs, model });
  } catch (err) {
    sendJson(res, 502, {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
      latencyMs: Date.now() - start,
    });
  }
}

export async function handleGeminiGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    sendJson(res, 503, { error: 'GEMINI_API_KEY is not set on the server.' });
    return;
  }

  let body: GeminiGenerateRequest;
  try {
    body = await readJsonBody<GeminiGenerateRequest>(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body.' });
    return;
  }

  const model = body.model || 'gemini-2.0-flash';
  const prompt = body.prompt ?? '';
  if (!prompt.trim()) {
    sendJson(res, 400, { error: 'prompt is required.' });
    return;
  }

  const start = Date.now();
  try {
    const response = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const latencyMs = Date.now() - start;

    if (response.status === 429) {
      sendJson(res, 429, { error: 'Gemini rate limit exceeded. Retry later.', latencyMs });
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      sendJson(res, response.status, { error: errText.slice(0, 1000), latencyMs });
      return;
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      sendJson(res, 502, { error: 'Empty response from Gemini.', latencyMs });
      return;
    }

    const result: GeminiGenerateResponse = {
      text,
      latencyMs,
      estimatedInputTokens: estimateTokens(prompt),
      estimatedOutputTokens: estimateTokens(text),
    };
    sendJson(res, 200, result);
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Request failed';
    const isTimeout = message.includes('timeout') || message.includes('aborted');
    sendJson(res, isTimeout ? 504 : 502, { error: message, latencyMs });
  }
}

export async function handleGeminiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (pathname.endsWith('/status') && req.method === 'GET') {
    await handleGeminiStatus(req, res);
    return;
  }
  if (pathname.endsWith('/test') && req.method === 'POST') {
    await handleGeminiTest(req, res);
    return;
  }
  if (req.method === 'POST') {
    await handleGeminiGenerate(req, res);
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
