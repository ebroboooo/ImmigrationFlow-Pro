import {
  CASE_COPILOT_PROMPT_VERSION,
  buildCaseChatPrompt,
  buildCaseEmailPrompt,
  buildCaseInsightsPrompt,
} from './caseCopilot.v1';

export { CASE_COPILOT_PROMPT_VERSION };

export function getCaseInsightsPrompt(contextJson: string) {
  return { prompt: buildCaseInsightsPrompt(contextJson), version: CASE_COPILOT_PROMPT_VERSION };
}

export function getCaseChatPrompt(contextJson: string, question: string, history: string) {
  return { prompt: buildCaseChatPrompt(contextJson, question, history), version: CASE_COPILOT_PROMPT_VERSION };
}

export function getCaseEmailPrompt(contextJson: string, emailType: string) {
  return { prompt: buildCaseEmailPrompt(contextJson, emailType), version: CASE_COPILOT_PROMPT_VERSION };
}
