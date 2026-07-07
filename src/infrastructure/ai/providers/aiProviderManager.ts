import type { ILLMProvider, ICaseCopilotProvider } from '../../../domain/ai/services';
import type { AIProviderHealth } from '../../../domain/ai/AIUsage';
import { geminiProvider } from './gemini/GeminiProvider';
import { geminiCaseCopilotProvider } from './gemini/GeminiCaseCopilotProvider';
import { unconfiguredLLMProvider } from './unconfiguredLLMProvider';
import { loadAISettings, saveAISettings, type AISettings } from '../settings/aiSettingsStorage';
import { getProviderHealth, loadHealth, loadUsage, updateProviderHealth } from '../telemetry/aiUsageTelemetry';
import { fetchGeminiStatus, testGeminiConnection } from './gemini/geminiApiClient';

/** Central registry — all LLM access must go through this manager. */
class AIProviderManager {
  private readonly providers: ILLMProvider[] = [geminiProvider, unconfiguredLLMProvider];

  listProviders(): ILLMProvider[] {
    return [...this.providers];
  }

  getProvider(id: string): ILLMProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  getSettings(): AISettings {
    return loadAISettings();
  }

  saveSettings(settings: AISettings): void {
    saveAISettings(settings);
  }

  getDefaultProviderId(): string {
    return loadAISettings().defaultProvider;
  }

  setDefaultProvider(id: 'gemini' | 'heuristic'): void {
    const settings = loadAISettings();
    saveAISettings({ ...settings, defaultProvider: id });
  }

  /** Active LLM for document analysis — respects enable flag and default provider. */
  getActiveLLMProvider(): ILLMProvider {
    const settings = loadAISettings();
    if (settings.defaultProvider === 'gemini' && settings.geminiEnabled) {
      const gemini = this.getProvider('gemini');
      if (gemini?.isConfigured()) return gemini;
    }
    return unconfiguredLLMProvider;
  }

  getLLMProviderStatus(): { configured: boolean; providerId: string; providerName: string } {
    const provider = this.getActiveLLMProvider();
    return {
      configured: provider.id !== 'unconfigured' && provider.isConfigured(),
      providerId: provider.id,
      providerName: provider.name,
    };
  }

  async refreshServerStatus(): Promise<AIProviderHealth | null> {
    try {
      const status = await fetchGeminiStatus();
      const settings = loadAISettings();
      const health: AIProviderHealth = {
        providerId: 'gemini',
        configured: status.configured,
        enabled: settings.geminiEnabled,
        ...(getProviderHealth('gemini') ?? {}),
      };
      updateProviderHealth(health);
      return health;
    } catch {
      return getProviderHealth('gemini');
    }
  }

  async testConnection(providerId: string): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    if (providerId === 'gemini') {
      const result = await testGeminiConnection();
      if (result.success) {
        updateProviderHealth({
          providerId: 'gemini',
          configured: true,
          enabled: loadAISettings().geminiEnabled,
          lastSuccessfulCall: new Date().toISOString(),
          lastLatencyMs: result.latencyMs,
          lastError: undefined,
        });
      } else {
        updateProviderHealth({
          providerId: 'gemini',
          configured: false,
          enabled: loadAISettings().geminiEnabled,
          lastError: result.error,
          lastLatencyMs: result.latencyMs,
        });
      }
      return result;
    }
    return { success: false, error: `Unknown provider: ${providerId}` };
  }

  getHealth(): AIProviderHealth[] {
    return loadHealth();
  }

  getUsageMetrics() {
    return loadUsage();
  }

  /** Case Copilot LLM — routes through same enable/config gates as document AI. */
  getCaseCopilotProvider(): ICaseCopilotProvider | null {
    const settings = loadAISettings();
    if (settings.defaultProvider === 'gemini' && settings.geminiEnabled && geminiCaseCopilotProvider.isConfigured()) {
      return geminiCaseCopilotProvider;
    }
    if (settings.geminiEnabled && geminiCaseCopilotProvider.isConfigured()) {
      return geminiCaseCopilotProvider;
    }
    return null;
  }
}

export const aiProviderManager = new AIProviderManager();

/** @deprecated Use aiProviderManager.getActiveLLMProvider() */
export function getActiveLLMProvider(): ILLMProvider {
  return aiProviderManager.getActiveLLMProvider();
}

export function getLLMProviderStatus() {
  return aiProviderManager.getLLMProviderStatus();
}

export function registerLLMProvider(provider: ILLMProvider): void {
  aiProviderManager.listProviders(); // ensure init
  (aiProviderManager as unknown as { providers: ILLMProvider[] }).providers.unshift(provider);
}
