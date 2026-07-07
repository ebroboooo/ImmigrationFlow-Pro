import type { CaseCopilotMessage } from '../../../domain/ai/CaseCopilot';
import type { CopilotScope } from '../../../domain/ai/CaseContext';
import { generateId } from '../../../lib/utils';

const CHAT_PREFIX = 'immflow_copilot_chat_';

function scopeKey(tenantId: string, scope: CopilotScope): string {
  const id = scope.type === 'case' ? `${scope.clientId}_${scope.caseId}` : scope.clientId;
  return `${tenantId}_${scope.type}_${id}`;
}

export function loadChatHistory(tenantId: string, scope: CopilotScope): CaseCopilotMessage[] {
  try {
    const raw = localStorage.getItem(`${CHAT_PREFIX}${scopeKey(tenantId, scope)}`);
    return raw ? (JSON.parse(raw) as CaseCopilotMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(tenantId: string, scope: CopilotScope, messages: CaseCopilotMessage[]): void {
  localStorage.setItem(`${CHAT_PREFIX}${scopeKey(tenantId, scope)}`, JSON.stringify(messages.slice(-50)));
}

export function appendChatMessage(
  tenantId: string,
  scope: CopilotScope,
  role: 'user' | 'assistant',
  content: string,
): CaseCopilotMessage[] {
  const messages = loadChatHistory(tenantId, scope);
  messages.push({ id: generateId(), role, content, timestamp: new Date().toISOString() });
  saveChatHistory(tenantId, scope, messages);
  return messages;
}

export function clearChatHistory(tenantId: string, scope: CopilotScope): void {
  localStorage.removeItem(`${CHAT_PREFIX}${scopeKey(tenantId, scope)}`);
}
