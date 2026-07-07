import type { ILLMProvider } from '../../../domain/ai/services';
import { aiProviderManager } from './aiProviderManager';

/** @deprecated Use aiProviderManager — kept for backward compatibility. */
const registeredProviders: ILLMProvider[] = [];

export function getActiveLLMProvider(): ILLMProvider {
  return aiProviderManager.getActiveLLMProvider();
}

export function getLLMProviderStatus() {
  return aiProviderManager.getLLMProviderStatus();
}

export function registerLLMProvider(provider: ILLMProvider): void {
  registeredProviders.unshift(provider);
  (aiProviderManager as unknown as { providers: ILLMProvider[] }).providers.unshift(provider);
}

export { aiProviderManager };
