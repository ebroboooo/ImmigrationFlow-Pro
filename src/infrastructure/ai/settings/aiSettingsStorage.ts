import { STORAGE_KEYS } from '../../../lib/constants';

export interface AISettings {
  geminiEnabled: boolean;
  defaultProvider: 'gemini' | 'heuristic';
  geminiModel: string;
  serverEndpoint: string;
  ocrEnabled: boolean;
  ocrDefaultProvider: 'tesseract' | 'none';
  ocrFallbackProvider: 'tesseract' | 'none';
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  geminiEnabled: true,
  defaultProvider: 'gemini',
  geminiModel: 'gemini-2.0-flash',
  serverEndpoint: '/api/ai/gemini',
  ocrEnabled: true,
  ocrDefaultProvider: 'tesseract',
  ocrFallbackProvider: 'none',
};

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.aiSettings);
    return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_AI_SETTINGS };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEYS.aiSettings, JSON.stringify(settings));
}
