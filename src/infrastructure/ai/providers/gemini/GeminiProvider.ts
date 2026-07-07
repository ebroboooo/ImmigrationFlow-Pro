import type { ILLMProvider, LLMAnalysisRequest, LLMAnalysisResponse } from '../../../../domain/ai/services';
import { getDocumentIntelligencePrompt } from '../../prompts/promptLibrary';
import { loadAISettings } from '../../settings/aiSettingsStorage';
import {
  estimateGeminiCostUsd,
  estimateTokens,
  recordUsage,
  updateProviderHealth,
  getProviderHealth,
} from '../../telemetry/aiUsageTelemetry';
import { callGeminiGenerate, GeminiApiError } from './geminiApiClient';
import {
  parseDocumentIntelligenceResponse,
  mergeLegacyFieldsFromIntelligence,
} from '../../intelligence/documentIntelligenceParser';
import { GeminiResponseParseError } from './geminiResponseParser';

export class GeminiProvider implements ILLMProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  isConfigured(): boolean {
    const settings = loadAISettings();
    if (!settings.geminiEnabled) return false;
    const health = getProviderHealth(this.id);
    if (health && !health.configured) return false;
    return true;
  }

  async analyzeDocument(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> {
    const settings = loadAISettings();
    if (!settings.geminiEnabled) {
      throw new Error('Gemini is disabled in AI Settings.');
    }

    const { prompt, version } = getDocumentIntelligencePrompt({
      text: request.text,
      fileName: request.fileName,
      documentTypeHint: request.documentType,
    });

    try {
      const result = await callGeminiGenerate(prompt, settings.geminiModel);
      const parsed = parseDocumentIntelligenceResponse(result.text);
      const analysis = parsed.geminiAnalysis;
      const intelligencePartial = parsed.intelligence;

      const usage = {
        providerId: this.id,
        model: settings.geminiModel,
        requestChars: prompt.length,
        estimatedInputTokens: result.estimatedInputTokens || estimateTokens(prompt),
        estimatedOutputTokens: result.estimatedOutputTokens || estimateTokens(result.text),
        estimatedCostUsd: estimateGeminiCostUsd(
          result.estimatedInputTokens || estimateTokens(prompt),
          result.estimatedOutputTokens || estimateTokens(result.text),
          settings.geminiModel,
        ),
        latencyMs: result.latencyMs,
        timestamp: new Date().toISOString(),
      };

      recordUsage(usage);
      updateProviderHealth({
        providerId: this.id,
        configured: true,
        enabled: true,
        lastSuccessfulCall: usage.timestamp,
        lastLatencyMs: usage.latencyMs,
        lastError: undefined,
      });

      const mergedFields = mergeLegacyFieldsFromIntelligence(
        analysis.fields,
        intelligencePartial.persons ?? [],
        intelligencePartial.caseEntity ?? {},
      );

      const fields: LLMAnalysisResponse['fields'] = {};
      for (const [key, val] of Object.entries(mergedFields)) {
        if (val?.value) {
          fields[key as keyof NonNullable<LLMAnalysisResponse['fields']>] = val;
        }
      }

      const detection = intelligencePartial.detection;

      return {
        fields,
        summary: analysis.summaries.plainEnglish,
        providerId: this.id,
        geminiAnalysis: analysis,
        intelligencePayload: parsed,
        usage,
        promptVersion: version,
        classification: {
          documentType: analysis.classification.documentType,
          confidence: analysis.classification.confidence,
          source: 'llm',
          reason: detection?.reason,
        },
      };
    } catch (err) {
      const message = err instanceof GeminiResponseParseError
        ? err.message
        : err instanceof GeminiApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Gemini analysis failed';

      updateProviderHealth({
        providerId: this.id,
        configured: err instanceof GeminiApiError && err.status !== 503,
        enabled: settings.geminiEnabled,
        lastError: message,
        lastLatencyMs: err instanceof GeminiApiError ? err.latencyMs : undefined,
      });
      throw new Error(message);
    }
  }
}

export const geminiProvider = new GeminiProvider();
