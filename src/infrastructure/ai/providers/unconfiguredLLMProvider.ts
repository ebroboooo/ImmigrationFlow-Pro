import type { ILLMProvider, LLMAnalysisRequest, LLMAnalysisResponse } from '../../../domain/ai/services';

/** Extension point — register OpenAI, Anthropic, Gemini, Azure, or Ollama providers in Phase 2. */
export class UnconfiguredLLMProvider implements ILLMProvider {
  readonly id = 'unconfigured';
  readonly name = 'LLM (Not Configured)';

  isConfigured(): boolean {
    return false;
  }

  async analyzeDocument(_request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> {
    throw new Error(
      'No AI provider is configured. Enable Gemini in Settings → AI and set GEMINI_API_KEY on the server.',
    );
  }
}

export const unconfiguredLLMProvider = new UnconfiguredLLMProvider();
