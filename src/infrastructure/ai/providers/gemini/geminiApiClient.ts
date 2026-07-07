import { loadAISettings } from '../../settings/aiSettingsStorage';

export interface GeminiApiResult {
  text: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export class GeminiApiError extends Error {
  readonly status: number;
  readonly latencyMs?: number;

  constructor(message: string, status: number, latencyMs?: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.latencyMs = latencyMs;
  }
}

export async function callGeminiGenerate(prompt: string, model?: string): Promise<GeminiApiResult> {
  const settings = loadAISettings();
  const endpoint = settings.serverEndpoint || '/api/ai/gemini';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model ?? settings.geminiModel,
      prompt,
    }),
  });

  const data = (await response.json()) as GeminiApiResult & { error?: string };

  if (!response.ok) {
    throw new GeminiApiError(data.error ?? `Gemini request failed (${response.status})`, response.status, data.latencyMs);
  }

  return data;
}

export async function fetchGeminiStatus(): Promise<{ configured: boolean }> {
  const settings = loadAISettings();
  const base = settings.serverEndpoint || '/api/ai/gemini';
  const response = await fetch(`${base}/status`);
  if (!response.ok) return { configured: false };
  return (await response.json()) as { configured: boolean };
}

export async function testGeminiConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const settings = loadAISettings();
  const base = settings.serverEndpoint || '/api/ai/gemini';
  const response = await fetch(`${base}/test`, { method: 'POST' });
  const data = (await response.json()) as { success: boolean; latencyMs?: number; error?: string };
  return data;
}
