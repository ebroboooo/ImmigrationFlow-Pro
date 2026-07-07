import type { IUnitOfWork } from '../../domain/repositories/IRepository';
import type { UserRole } from '../../domain/models/User';
import type { CopilotScope } from '../../domain/ai/CaseContext';
import type { CaseCopilotEmailDraft, CaseCopilotInsights, CaseCopilotMessage } from '../../domain/ai/CaseCopilot';
import { buildCaseContext } from './caseKnowledgeService';
import { assertCaseCopilotAccess } from './caseCopilotPermissions';
import { aiProviderManager } from '../../infrastructure/ai/providers/aiProviderManager';
import { generateHeuristicInsights } from '../../infrastructure/ai/copilot/caseCopilotHeuristics';
import { getCachedInsights, setCachedInsights, invalidateCopilotCache } from '../../infrastructure/ai/copilot/caseCopilotCache';
import {
  appendChatMessage,
  clearChatHistory,
  loadChatHistory,
} from '../../infrastructure/ai/copilot/caseCopilotChatStorage';

export class CaseCopilotService {
  async getInsights(
    repos: IUnitOfWork,
    tenantId: string,
    scope: CopilotScope,
    role: UserRole | undefined,
    forceRefresh = false,
  ): Promise<{ context: Awaited<ReturnType<typeof buildCaseContext>>; insights: CaseCopilotInsights }> {
    assertCaseCopilotAccess(role, scope);
    const context = await buildCaseContext(repos, tenantId, scope);

    if (!forceRefresh) {
      const cached = getCachedInsights(tenantId, scope, context.fingerprint);
      if (cached) return { context, insights: cached };
    } else {
      invalidateCopilotCache(tenantId, scope);
    }

    const provider = aiProviderManager.getCaseCopilotProvider();
    let insights: CaseCopilotInsights;

    if (provider?.isConfigured()) {
      insights = await provider.generateInsights(context);
    } else {
      insights = generateHeuristicInsights(context);
    }

    setCachedInsights(tenantId, scope, context.fingerprint, insights);
    return { context, insights };
  }

  async askQuestion(
    repos: IUnitOfWork,
    tenantId: string,
    scope: CopilotScope,
    role: UserRole | undefined,
    question: string,
  ): Promise<{ answer: string; messages: CaseCopilotMessage[] }> {
    assertCaseCopilotAccess(role, scope);
    const context = await buildCaseContext(repos, tenantId, scope);
    appendChatMessage(tenantId, scope, 'user', question);

    const provider = aiProviderManager.getCaseCopilotProvider();
    let answer: string;

    if (provider?.isConfigured()) {
      const history = loadChatHistory(tenantId, scope);
      answer = await provider.askQuestion(context, question, history);
    } else {
      const insights = generateHeuristicInsights(context);
      answer = `Based on case data: ${insights.executiveSummary}\n\nSuggested next steps: ${insights.suggestedNextActions.join('; ')}`;
    }

    const messages = appendChatMessage(tenantId, scope, 'assistant', answer);
    return { answer, messages };
  }

  async generateEmailDraft(
    repos: IUnitOfWork,
    tenantId: string,
    scope: CopilotScope,
    role: UserRole | undefined,
    type: CaseCopilotEmailDraft['type'],
  ): Promise<{ subject: string; body: string }> {
    assertCaseCopilotAccess(role, scope);
    const context = await buildCaseContext(repos, tenantId, scope);
    const provider = aiProviderManager.getCaseCopilotProvider();

    if (provider?.isConfigured()) {
      return provider.generateEmailDraft(context, type);
    }

    const client = context.client.name;
    const templates: Record<CaseCopilotEmailDraft['type'], { subject: string; body: string }> = {
      client_update: {
        subject: `Case update — ${client}`,
        body: `Dear ${client},\n\nWe are writing with an update on your immigration matter.\n\n[Add details]\n\nBest regards,\nYour Immigration Team`,
      },
      missing_docs: {
        subject: `Documents needed — ${client}`,
        body: `Dear ${client},\n\nPlease provide the following documents at your earliest convenience:\n\n- [List documents]\n\nBest regards,\nYour Immigration Team`,
      },
      appointment_reminder: {
        subject: `Appointment reminder — ${client}`,
        body: `Dear ${client},\n\nThis is a reminder of your upcoming appointment.\n\nBest regards,\nYour Immigration Team`,
      },
      interview_prep: {
        subject: `Interview preparation — ${client}`,
        body: `Dear ${client},\n\nPlease review the attached preparation checklist before your USCIS interview.\n\nBest regards,\nYour Immigration Team`,
      },
      follow_up: {
        subject: `Follow-up — ${client}`,
        body: `Dear ${client},\n\nWe are following up regarding your case. Please contact our office if you have questions.\n\nBest regards,\nYour Immigration Team`,
      },
    };
    return templates[type];
  }

  getChatHistory(tenantId: string, scope: CopilotScope, role: UserRole | undefined): CaseCopilotMessage[] {
    assertCaseCopilotAccess(role, scope);
    return loadChatHistory(tenantId, scope);
  }

  clearChat(tenantId: string, scope: CopilotScope, role: UserRole | undefined): void {
    assertCaseCopilotAccess(role, scope);
    clearChatHistory(tenantId, scope);
  }
}

export const caseCopilotService = new CaseCopilotService();
