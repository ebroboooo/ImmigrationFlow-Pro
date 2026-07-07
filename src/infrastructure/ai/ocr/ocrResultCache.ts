import type { OCRResult } from '../../../domain/ai/services';

const CACHE_PREFIX = 'immflow_ocr_cache_';

function cacheKey(storageKey: string, fileSize: number): string {
  return `${CACHE_PREFIX}${storageKey}_${fileSize}`;
}

export function getCachedOcrResult(storageKey: string, fileSize: number): OCRResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(storageKey, fileSize));
    return raw ? { ...(JSON.parse(raw) as OCRResult), fromCache: true } : null;
  } catch {
    return null;
  }
}

export function setCachedOcrResult(storageKey: string, fileSize: number, result: OCRResult): void {
  try {
    localStorage.setItem(cacheKey(storageKey, fileSize), JSON.stringify({ ...result, fromCache: false }));
  } catch {
    // Storage full — skip cache
  }
}

export function invalidateOcrCache(storageKey: string, fileSize: number): void {
  localStorage.removeItem(cacheKey(storageKey, fileSize));
}
