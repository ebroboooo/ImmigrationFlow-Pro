export interface AIUsageMetrics {
  providerId: string;
  model: string;
  requestChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  timestamp: string;
}

export interface AIProviderHealth {
  providerId: string;
  configured: boolean;
  enabled: boolean;
  lastSuccessfulCall?: string;
  lastError?: string;
  lastLatencyMs?: number;
}
