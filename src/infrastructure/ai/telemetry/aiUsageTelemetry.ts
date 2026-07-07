import type { AIUsageMetrics, AIProviderHealth } from '../../../domain/ai/AIUsage';

const USAGE_KEY = 'immflow_ai_usage';
const HEALTH_KEY = 'immflow_ai_health';
const MAX_RECORDS = 100;

export function recordUsage(metrics: AIUsageMetrics): void {
  const existing = loadUsage();
  existing.unshift(metrics);
  localStorage.setItem(USAGE_KEY, JSON.stringify(existing.slice(0, MAX_RECORDS)));
}

export function loadUsage(): AIUsageMetrics[] {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? (JSON.parse(raw) as AIUsageMetrics[]) : [];
  } catch {
    return [];
  }
}

export function updateProviderHealth(health: Partial<AIProviderHealth> & { providerId: string }): void {
  const all = loadHealth();
  const idx = all.findIndex((h) => h.providerId === health.providerId);
  const merged: AIProviderHealth = {
    ...(idx >= 0 ? all[idx] : { providerId: health.providerId, configured: false, enabled: false }),
    ...health,
  };
  if (idx >= 0) all[idx] = merged;
  else all.push(merged);
  localStorage.setItem(HEALTH_KEY, JSON.stringify(all));
}

export function loadHealth(): AIProviderHealth[] {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    return raw ? (JSON.parse(raw) as AIProviderHealth[]) : [];
  } catch {
    return [];
  }
}

export function getProviderHealth(providerId: string): AIProviderHealth | null {
  return loadHealth().find((h) => h.providerId === providerId) ?? null;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateGeminiCostUsd(inputTokens: number, outputTokens: number, model: string): number {
  const rates: Record<string, { in: number; out: number }> = {
    'gemini-2.0-flash': { in: 0.0000001, out: 0.0000004 },
    'gemini-1.5-flash': { in: 0.000000075, out: 0.0000003 },
    'gemini-1.5-pro': { in: 0.00000125, out: 0.000005 },
  };
  const rate = rates[model] ?? rates['gemini-2.0-flash'];
  return inputTokens * rate.in + outputTokens * rate.out;
}
