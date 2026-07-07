import type { IOCRProvider, OCRResult, OCRExtractOptions } from '../../../domain/ai/services';
import { tesseractOCRProvider } from './providers/tesseractOCRProvider';
import { unconfiguredOCRProvider } from './unconfiguredOCRProvider';
import { loadAISettings, type AISettings } from '../settings/aiSettingsStorage';
import {
  getOcrProviderHealth,
  loadOcrHealth,
  loadOcrUsage,
  updateOcrProviderHealth,
  computeOcrAverages,
} from '../telemetry/ocrUsageTelemetry';
import type { OCRProviderHealth } from '../../../domain/ai/OCRUsage';
import { getCachedOcrResult, setCachedOcrResult } from './ocrResultCache';

/** Central OCR registry — all OCR access must go through this manager. */
class OCRProviderManager {
  private readonly providers: IOCRProvider[] = [tesseractOCRProvider, unconfiguredOCRProvider];

  listProviders(): IOCRProvider[] {
    return [...this.providers];
  }

  getProvider(id: string): IOCRProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  registerProvider(provider: IOCRProvider): void {
    this.providers.unshift(provider);
  }

  getSettings(): AISettings {
    return loadAISettings();
  }

  getActiveProvider(): IOCRProvider | null {
    const settings = loadAISettings();
    if (!settings.ocrEnabled) return null;
    const primary = this.getProvider(settings.ocrDefaultProvider);
    if (primary?.isConfigured() && primary.isAvailable()) return primary;
    if (settings.ocrFallbackProvider && settings.ocrFallbackProvider !== 'none') {
      const fallback = this.getProvider(settings.ocrFallbackProvider);
      if (fallback?.isConfigured() && fallback.isAvailable()) return fallback;
    }
    return null;
  }

  getProviderChain(): IOCRProvider[] {
    const settings = loadAISettings();
    if (!settings.ocrEnabled) return [];
    const chain: IOCRProvider[] = [];
    const primary = settings.ocrDefaultProvider !== 'none'
      ? this.getProvider(settings.ocrDefaultProvider)
      : undefined;
    const fallback = settings.ocrFallbackProvider !== 'none'
      ? this.getProvider(settings.ocrFallbackProvider)
      : undefined;
    if (primary?.isConfigured() && primary.isAvailable()) chain.push(primary);
    if (fallback?.isConfigured() && fallback.isAvailable() && fallback.id !== primary?.id) {
      chain.push(fallback);
    }
    return chain;
  }

  isOcrConfigured(): boolean {
    return this.getActiveProvider() !== null;
  }

  async extractText(
    file: Blob,
    mimeType: string,
    options?: OCRExtractOptions & { storageKey?: string; fileSize?: number },
  ): Promise<OCRResult> {
    if (options?.storageKey && options.fileSize) {
      const cached = getCachedOcrResult(options.storageKey, options.fileSize);
      if (cached) return cached;
    }

    const chain = this.getProviderChain();
    if (chain.length === 0) {
      throw new Error('No OCR provider is configured. Enable OCR in Settings → AI.');
    }

    let lastError: Error | null = null;
    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i];
      if (!provider.supports(mimeType, options?.fileName ?? '')) continue;
      try {
        const result = await provider.extractText(file, mimeType, options);
        if (i > 0) result.fallbackUsed = true;
        if (options?.storageKey && options.fileSize && result.method === 'ocr') {
          setCachedOcrResult(options.storageKey, options.fileSize, result);
        }
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('OCR failed');
        updateOcrProviderHealth({
          providerId: provider.id,
          lastError: lastError.message,
        });
      }
    }

    throw lastError ?? new Error('OCR could not process this document type.');
  }

  async testConnection(providerId: string): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const provider = this.getProvider(providerId);
    if (!provider?.testConnection) {
      return { success: false, error: 'Provider does not support connection tests.' };
    }
    const result = await provider.testConnection();
    updateOcrProviderHealth({
      providerId,
      configured: result.success,
      enabled: loadAISettings().ocrEnabled,
      lastSuccessfulCall: result.success ? new Date().toISOString() : undefined,
      lastLatencyMs: result.latencyMs,
      lastError: result.error,
    });
    return result;
  }

  getHealth(): OCRProviderHealth[] {
    return loadOcrHealth();
  }

  getUsageMetrics() {
    return loadOcrUsage();
  }

  getProviderStatus(): {
    configured: boolean;
    providerId: string;
    providerName: string;
    averageConfidence: number;
    averageProcessingTimeMs: number;
  } {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        configured: false,
        providerId: 'none',
        providerName: 'Not configured',
        averageConfidence: 0,
        averageProcessingTimeMs: 0,
      };
    }
    const health = getOcrProviderHealth(provider.id);
    const avgs = computeOcrAverages(provider.id);
    return {
      configured: true,
      providerId: provider.id,
      providerName: provider.name,
      averageConfidence: health?.averageConfidence ?? avgs.avgConfidence,
      averageProcessingTimeMs: health?.averageProcessingTimeMs ?? avgs.avgTimeMs,
    };
  }
}

export const ocrProviderManager = new OCRProviderManager();

export function isOCRConfigured(): boolean {
  return ocrProviderManager.isOcrConfigured();
}
