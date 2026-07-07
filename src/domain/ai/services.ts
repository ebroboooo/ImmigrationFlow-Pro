export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IFileValidator {
  validate(file: File): FileValidationResult;
}

export interface OCRResult {
  text: string;
  confidence: number;
  providerId: string;
  pageCount: number;
  processingTimeMs: number;
  warnings: string[];
  method: 'native_pdf' | 'ocr' | 'plain_text';
  language?: string;
  fromCache?: boolean;
  fallbackUsed?: boolean;
}

export interface OCRExtractOptions {
  fileName?: string;
  signal?: AbortSignal;
  onProgress?: (progress: import('./OCRUsage').OCRProgress) => void;
}

export interface IOCRProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedMimeTypes: readonly string[];
  readonly supportedExtensions: readonly string[];
  isAvailable(): boolean;
  isConfigured(): boolean;
  supports(mimeType: string, fileName: string): boolean;
  extractText(file: Blob, mimeType: string, options?: OCRExtractOptions): Promise<OCRResult>;
  testConnection?(): Promise<{ success: boolean; latencyMs?: number; error?: string }>;
}

export interface TextExtractionResult {
  text: string;
  method: 'plain_text' | 'ocr' | 'llm_vision';
  complete: boolean;
}

export interface ITextExtractor {
  canExtract(mimeType: string, fileName: string): boolean;
  extract(file: Blob, fileName: string, mimeType: string): Promise<TextExtractionResult>;
}

export interface IDocumentClassifier {
  classify(text: string, fileName: string): import('./DocumentClassification').ClassificationResult;
}

export interface LLMAnalysisRequest {
  text: string;
  fileName: string;
  documentType?: string;
}

export interface LLMAnalysisResponse {
  fields: Partial<Record<string, { value: string; confidence: number }>>;
  summary?: string;
  providerId: string;
  geminiAnalysis?: import('./GeminiAnalysis').GeminiDocumentAnalysis;
  intelligencePayload?: import('./DocumentIntelligence').ParsedIntelligencePayload;
  documentIntelligence?: import('./DocumentIntelligence').DocumentIntelligenceResult;
  usage?: import('./AIUsage').AIUsageMetrics;
  promptVersion?: string;
  classification?: import('./DocumentClassification').ClassificationResult;
}

export interface ILLMProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  analyzeDocument(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse>;
}

export interface ICaseCopilotProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  generateInsights(context: import('./CaseContext').CaseContext): Promise<import('./CaseCopilot').CaseCopilotInsights>;
  askQuestion(
    context: import('./CaseContext').CaseContext,
    question: string,
    history: import('./CaseCopilot').CaseCopilotMessage[],
  ): Promise<string>;
  generateEmailDraft(
    context: import('./CaseContext').CaseContext,
    type: import('./CaseCopilot').CaseCopilotEmailDraft['type'],
  ): Promise<{ subject: string; body: string }>;
}

export interface IRecommendationService {
  generate(input: import('./IntakeRecommendations').RecommendationInput): import('./IntakeRecommendations').IntakeRecommendations;
}

export interface IEmailDraftService {
  generateDraft(input: import('./IntakeRecommendations').RecommendationInput): import('./IntakeRecommendations').SuggestedEmailDraft;
}

export interface ITaskSuggestionService {
  suggestTasks(input: import('./IntakeRecommendations').RecommendationInput): import('./IntakeRecommendations').SuggestedTask[];
}

export interface ICalendarSuggestionService {
  suggestEvents(input: import('./IntakeRecommendations').RecommendationInput): import('./IntakeRecommendations').SuggestedCalendarEvent[];
}

export interface IWorkflowAutomationService {
  executeApproved(
    session: import('./IntakeSession').IntakeSession,
    tenantId: string,
    userId: string,
  ): Promise<import('./AutomationPlan').AutomationExecutionResult[]>;
}
