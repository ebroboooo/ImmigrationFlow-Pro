import {
  DOCUMENT_ANALYSIS_PROMPT_VERSION,
  buildDocumentAnalysisPrompt,
} from './documentAnalysis.v1';
import {
  DOCUMENT_INTELLIGENCE_PROMPT_VERSION,
  buildDocumentIntelligencePrompt,
} from './documentIntelligence.v1';

export const PROMPT_LIBRARY_VERSION = DOCUMENT_INTELLIGENCE_PROMPT_VERSION;

export function getDocumentAnalysisPrompt(params: {
  text: string;
  fileName: string;
  documentTypeHint?: string;
}): { prompt: string; version: string } {
  return {
    prompt: buildDocumentAnalysisPrompt(params),
    version: DOCUMENT_ANALYSIS_PROMPT_VERSION,
  };
}

export function getDocumentIntelligencePrompt(params: {
  text: string;
  fileName: string;
  documentTypeHint?: string;
}): { prompt: string; version: string } {
  return {
    prompt: buildDocumentIntelligencePrompt(params),
    version: DOCUMENT_INTELLIGENCE_PROMPT_VERSION,
  };
}
