import { generateId } from '../../lib/utils';
import type { IntakeSession } from '../../domain/ai/IntakeSession';
import type { ExtractedImmigrationFields } from '../../domain/ai/ExtractedFields';
import { emptyExtractedFields, fieldValue } from '../../domain/ai/ExtractedFields';
import type { AutomationAction } from '../../domain/ai/AutomationPlan';
import { DEFAULT_AUTOMATION_ACTIONS } from '../../domain/ai/AutomationPlan';
import { fileValidatorService } from '../../infrastructure/ai/validation/fileValidatorService';
import { extractDocumentText } from '../../infrastructure/ai/extraction/documentTextExtractionService';
import { patternFieldExtractor } from '../../infrastructure/ai/extraction/patternFieldExtractor';
import { heuristicDocumentClassifier } from '../../infrastructure/ai/classification/heuristicDocumentClassifier';
import { aiProviderManager } from '../../infrastructure/ai/providers/aiProviderManager';
import { mapGeminiAnalysisToRecommendations } from './geminiRecommendationMapper';
import { documentIntelligenceService } from './documentIntelligenceService';
import { ocrProviderManager } from '../../infrastructure/ai/ocr/ocrProviderManager';
import { ruleBasedRecommendationService } from '../../infrastructure/ai/recommendations/ruleBasedRecommendationService';
import { aiIntakeFileStorage } from '../../infrastructure/ai/storage/aiIntakeFileStorage';
import { intakeSessionStorage, createAuditRecord } from '../../infrastructure/ai/storage/intakeSessionStorage';

export interface PipelineOptions {
  onSessionUpdate?: (session: IntakeSession) => void;
  signal?: AbortSignal;
}

function buildAutomationActions(): AutomationAction[] {
  return DEFAULT_AUTOMATION_ACTIONS.map((a) => ({
    ...a,
    selected: ['attach_document', 'generate_tasks'].includes(a.type),
    enabled: true,
  }));
}

function mergeLLMFields(
  base: ExtractedImmigrationFields,
  llm: Partial<Record<string, { value: string; confidence: number }>>,
): ExtractedImmigrationFields {
  const merged = { ...base, extractionSource: 'hybrid' as const };
  const confidences = [base.overallConfidence];
  for (const [key, val] of Object.entries(llm)) {
    if (!val?.value) continue;
    (merged as unknown as Record<string, unknown>)[key] = fieldValue(val.value, val.confidence, 'llm');
    confidences.push(val.confidence);
  }
  merged.overallConfidence = Math.max(...confidences);
  return merged;
}

function notifyUpdate(session: IntakeSession, options?: PipelineOptions): void {
  options?.onSessionUpdate?.(session);
}

export class IntakePipelineService {
  async createSession(
    file: File,
    tenantId: string,
    userId?: string,
    options?: PipelineOptions,
  ): Promise<IntakeSession> {
    const storageKey = generateId();
    await aiIntakeFileStorage.save(storageKey, file);

    const ocrAvailable = ocrProviderManager.isOcrConfigured();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const ocrCandidate = file.type === 'application/pdf' || file.type.startsWith('image/')
      || ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'].includes(ext);
    const plainText = ['txt', 'json'].includes(ext) || file.type === 'text/plain' || file.type === 'application/json';

    const session: IntakeSession = {
      id: generateId(),
      tenantId,
      file: {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        storageKey,
      },
      status: 'uploaded',
      currentStage: 'validation',
      extractedText: '',
      ocrRequired: ocrCandidate && !plainText,
      ocrAvailable,
      classification: null,
      extractedFields: emptyExtractedFields(),
      recommendations: ruleBasedRecommendationService.generate({
        fields: emptyExtractedFields(),
        documentType: 'Unknown',
        rawText: '',
      }),
      automationActions: buildAutomationActions(),
      audit: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    intakeSessionStorage.save(session);
    notifyUpdate(session, options);
    intakeSessionStorage.appendAudit(session, createAuditRecord('session_created', {
      userId,
      documentVersion: file.name,
      details: `Uploaded ${file.name} (${file.size} bytes)`,
    }));

    return this.runPipeline(session.id, tenantId, userId, options);
  }

  async runPipeline(
    sessionId: string,
    tenantId: string,
    _userId?: string,
    options?: PipelineOptions,
  ): Promise<IntakeSession> {
    let session = intakeSessionStorage.getById(tenantId, sessionId);
    if (!session) throw new Error('Intake session not found.');

    try {
      if (options?.signal?.aborted) throw new Error('Processing cancelled.');

      session = this.update(session, { status: 'validating', currentStage: 'validation' });
      notifyUpdate(session, options);
      const blob = await aiIntakeFileStorage.get(session.file.storageKey);
      if (!blob) throw new Error('Uploaded file could not be retrieved.');
      const file = new File([blob], session.file.fileName, { type: session.file.mimeType });
      const validation = fileValidatorService.validate(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(' '));
      }
      intakeSessionStorage.appendAudit(session, createAuditRecord('pipeline_stage', { stage: 'validation', details: 'File validation passed' }));
      session = intakeSessionStorage.getById(tenantId, sessionId)!;

      session = this.update(session, { status: 'extracting_text', currentStage: 'text_extraction' });
      notifyUpdate(session, options);

      const textResult = await extractDocumentText({
        file: blob,
        fileName: session.file.fileName,
        mimeType: session.file.mimeType,
        storageKey: session.file.storageKey,
        options: {
          signal: options?.signal,
          fileName: session.file.fileName,
          onProgress: (progress) => {
            const current = intakeSessionStorage.getById(tenantId, sessionId);
            if (!current) return;
            session = this.update(current, {
              status: progress.stage === 'complete' ? 'extracting_text' : 'ocr_processing',
              currentStage: progress.stage === 'detecting' ? 'text_extraction' : 'ocr',
              ocrMetadata: {
                ...(current.ocrMetadata ?? { method: 'ocr', warnings: [] }),
                progress,
              },
            });
            notifyUpdate(session, options);
          },
        },
      });

      let extractedText = textResult.text;
      let sessionPatch: Partial<IntakeSession> = {
        extractedText,
        ocrRequired: textResult.ocrRequired,
        ocrAvailable: textResult.ocrAvailable,
        ocrMetadata: textResult.ocrMetadata,
      };

      if (textResult.ocrRequired && !textResult.text && textResult.ocrAvailable) {
        session = this.update(session, { ...sessionPatch, status: 'ocr_pending', currentStage: 'ocr' });
        notifyUpdate(session, options);
      } else if (textResult.ocrRequired && !textResult.text) {
        session = this.update(session, { ...sessionPatch, status: 'ocr_pending', currentStage: 'ocr' });
        notifyUpdate(session, options);
      }

      if (textResult.ocrMetadata.providerId) {
        intakeSessionStorage.appendAudit(session, createAuditRecord('extraction', {
          providerId: textResult.ocrMetadata.providerId,
          confidence: textResult.ocrMetadata.confidence,
          details: textResult.ocrMetadata.skippedOcr
            ? 'Native PDF text — OCR skipped'
            : `OCR ${textResult.ocrMetadata.pageCount ?? 0} pages (${textResult.ocrMetadata.processingTimeMs ?? 0}ms)`,
        }));
      }

      session = this.update(session, { ...sessionPatch, currentStage: 'classification', status: 'classifying' });
      notifyUpdate(session, options);

      let classification = heuristicDocumentClassifier.classify(extractedText, session.file.fileName);
      intakeSessionStorage.appendAudit(session, createAuditRecord('classification', {
        confidence: classification.confidence,
        details: `${classification.documentType} (${classification.source})`,
      }));

      session = this.update(session, { classification, currentStage: 'ai_extraction', status: 'analyzing' });
      notifyUpdate(session, options);
      let extractedFields = patternFieldExtractor.extract(extractedText, session.file.fileName);
      let documentIntelligence = await documentIntelligenceService.build({
        tenantId: session.tenantId,
        classification,
        patternFields: extractedFields,
        ocrConfidence: session.ocrMetadata?.confidence,
      });
      let recommendations = ruleBasedRecommendationService.generate({
        fields: extractedFields,
        documentType: classification.documentType,
        rawText: extractedText,
      });
      let aiMetadata = session.aiMetadata;

      const llm = aiProviderManager.getActiveLLMProvider();
      if (llm.isConfigured() && extractedText) {
        try {
          const llmResult = await llm.analyzeDocument({
            text: extractedText,
            fileName: session.file.fileName,
            documentType: classification.documentType,
          });
          extractedFields = mergeLLMFields(extractedFields, llmResult.fields);

          if (llmResult.classification) {
            classification = llmResult.classification;
            session = this.update(session, { classification });
            intakeSessionStorage.appendAudit(session, createAuditRecord('classification', {
              confidence: classification.confidence,
              providerId: llmResult.providerId,
              details: `${classification.documentType} (Gemini)`,
            }));
          }

          if (llmResult.geminiAnalysis) {
            recommendations = mapGeminiAnalysisToRecommendations(llmResult.geminiAnalysis);
          }

          documentIntelligence = await documentIntelligenceService.build({
            tenantId: session.tenantId,
            parsed: llmResult.intelligencePayload,
            classification,
            patternFields: extractedFields,
            ocrConfidence: session.ocrMetadata?.confidence,
            promptVersion: llmResult.promptVersion,
          });
          extractedFields = documentIntelligenceService.mapToLegacyFields(documentIntelligence);

          aiMetadata = {
            providerId: llmResult.providerId,
            model: llmResult.usage?.model,
            promptVersion: llmResult.promptVersion,
            analysisComplete: true,
            overallConfidence: documentIntelligence.overallConfidence,
            riskLevel: llmResult.geminiAnalysis?.riskLevel,
            warnings: llmResult.geminiAnalysis?.warnings ?? [],
            usage: llmResult.usage,
          };

          intakeSessionStorage.appendAudit(session, createAuditRecord('extraction', {
            providerId: llmResult.providerId,
            confidence: extractedFields.overallConfidence,
            details: `Document intelligence (${llmResult.usage?.latencyMs ?? 0}ms)`,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Gemini analysis failed';
          intakeSessionStorage.appendAudit(session, createAuditRecord('extraction', {
            providerId: 'gemini',
            details: `Gemini failed — pattern fallback: ${message}`,
          }));
        }
      } else {
        extractedFields = documentIntelligenceService.mapToLegacyFields(documentIntelligence);
        intakeSessionStorage.appendAudit(session, createAuditRecord('extraction', {
          providerId: 'pattern',
          confidence: extractedFields.overallConfidence,
          details: llm.isConfigured() ? 'Pattern extraction only (no text)' : 'LLM not configured — pattern extraction used',
        }));
      }

      session = this.update(session, {
        extractedFields,
        documentIntelligence,
        recommendations,
        aiMetadata,
        currentStage: 'recommendations',
      });
      notifyUpdate(session, options);
      intakeSessionStorage.appendAudit(session, createAuditRecord('recommendations_generated', {
        confidence: extractedFields.overallConfidence,
        providerId: aiMetadata?.providerId,
      }));

      session = this.update(session, {
        recommendations,
        status: extractedText || !session.ocrRequired ? 'awaiting_review' : 'ocr_pending',
        currentStage: 'human_review',
      });
      notifyUpdate(session, options);

      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pipeline failed.';
      session = this.update(session, { status: 'failed', errorMessage: message });
      notifyUpdate(session, options);
      throw new Error(message);
    }
  }

  saveReviewedSession(session: IntakeSession, userId: string): IntakeSession {
    const updated = {
      ...session,
      updatedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: userId,
    };
    intakeSessionStorage.save(updated);
    intakeSessionStorage.appendAudit(updated, createAuditRecord('review_edited', { userId }));
    return updated;
  }

  approveSession(session: IntakeSession, userId: string): IntakeSession {
    const updated = {
      ...session,
      status: 'approved' as const,
      reviewDecision: 'approved' as const,
      currentStage: 'automation' as const,
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: userId,
      updatedAt: new Date().toISOString(),
    };
    intakeSessionStorage.save(updated);
    intakeSessionStorage.appendAudit(updated, createAuditRecord('approved', {
      userId,
      confidence: session.extractedFields.overallConfidence,
      automationActions: session.automationActions.filter((a) => a.selected).map((a) => a.type),
    }));
    return updated;
  }

  rejectSession(session: IntakeSession, userId: string): IntakeSession {
    const updated = {
      ...session,
      status: 'rejected' as const,
      reviewDecision: 'rejected' as const,
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: userId,
      updatedAt: new Date().toISOString(),
    };
    intakeSessionStorage.save(updated);
    intakeSessionStorage.appendAudit(updated, createAuditRecord('rejected', { userId }));
    return updated;
  }

  private update(session: IntakeSession, patch: Partial<IntakeSession>): IntakeSession {
    const updated = { ...session, ...patch, updatedAt: new Date().toISOString() };
    intakeSessionStorage.save(updated);
    return updated;
  }
}

export const intakePipelineService = new IntakePipelineService();
