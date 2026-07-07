import { loadAISettings } from './settings/aiSettingsStorage';

export const aiConfig = {
  llmProvider: (import.meta.env.VITE_AI_LLM_PROVIDER ?? 'gemini') as '' | 'openai' | 'anthropic' | 'gemini' | 'azure' | 'ollama',
  /** API keys are server-side only — set GEMINI_API_KEY in server environment. */
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
  azureOpenAiEndpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT ?? '',
  azureOpenAiKey: import.meta.env.VITE_AZURE_OPENAI_KEY ?? '',
  ollamaBaseUrl: import.meta.env.VITE_OLLAMA_BASE_URL ?? 'http://localhost:11434',
  ocrProvider: (import.meta.env.VITE_AI_OCR_PROVIDER ?? '') as '' | 'tesseract' | 'google_vision' | 'azure',
  maxUploadBytes: 25 * 1024 * 1024,
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/json',
  ],
  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'json'],
} as const;

export function isAnyLLMConfigured(): boolean {
  return Boolean(
    aiConfig.openaiApiKey
    || aiConfig.anthropicApiKey
    || aiConfig.llmProvider === 'gemini'
    || (aiConfig.azureOpenAiEndpoint && aiConfig.azureOpenAiKey)
    || aiConfig.llmProvider === 'ollama',
  );
}

export function isOCRConfigured(): boolean {
  const settings = loadAISettings();
  return settings.ocrEnabled && settings.ocrDefaultProvider !== 'none';
}
