import type { OCRUsageRecord, OCRProviderHealth } from '../../../domain/ai/OCRUsage';

const USAGE_KEY = 'immflow_ocr_usage';
const HEALTH_KEY = 'immflow_ocr_health';
const MAX_RECORDS = 100;

export function recordOcrUsage(record: OCRUsageRecord): void {
  const existing = loadOcrUsage();
  existing.unshift(record);
  localStorage.setItem(USAGE_KEY, JSON.stringify(existing.slice(0, MAX_RECORDS)));
}

export function loadOcrUsage(): OCRUsageRecord[] {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? (JSON.parse(raw) as OCRUsageRecord[]) : [];
  } catch {
    return [];
  }
}

export function updateOcrProviderHealth(health: Partial<OCRProviderHealth> & { providerId: string }): void {
  const all = loadOcrHealth();
  const idx = all.findIndex((h) => h.providerId === health.providerId);
  const merged: OCRProviderHealth = {
    ...(idx >= 0 ? all[idx] : { providerId: health.providerId, configured: false, enabled: false }),
    ...health,
  };
  if (idx >= 0) all[idx] = merged;
  else all.push(merged);
  localStorage.setItem(HEALTH_KEY, JSON.stringify(all));
}

export function loadOcrHealth(): OCRProviderHealth[] {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    return raw ? (JSON.parse(raw) as OCRProviderHealth[]) : [];
  } catch {
    return [];
  }
}

export function getOcrProviderHealth(providerId: string): OCRProviderHealth | null {
  return loadOcrHealth().find((h) => h.providerId === providerId) ?? null;
}

export function computeOcrAverages(providerId: string): { avgConfidence: number; avgTimeMs: number } {
  const records = loadOcrUsage().filter((r) => r.providerId === providerId && !r.error);
  if (records.length === 0) return { avgConfidence: 0, avgTimeMs: 0 };
  const avgConfidence = records.reduce((s, r) => s + r.confidence, 0) / records.length;
  const avgTimeMs = records.reduce((s, r) => s + r.processingTimeMs, 0) / records.length;
  return { avgConfidence, avgTimeMs };
}
