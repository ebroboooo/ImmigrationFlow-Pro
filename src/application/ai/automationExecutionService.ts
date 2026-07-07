import type { IntakeSession } from '../../domain/ai/IntakeSession';
import type { AutomationExecutionResult } from '../../domain/ai/AutomationPlan';
import type { IUnitOfWork } from '../../domain/repositories/IRepository';
import { WorkflowAutomationService } from '../../infrastructure/ai/automation/workflowAutomationService';
import { intakeSessionStorage, createAuditRecord } from '../../infrastructure/ai/storage/intakeSessionStorage';

export class AutomationExecutionService {
  async execute(session: IntakeSession, repos: IUnitOfWork, tenantId: string, userId: string): Promise<AutomationExecutionResult[]> {
    if (session.status !== 'approved') {
      throw new Error('Automations can only run after approval.');
    }

    const executor = new WorkflowAutomationService(repos);
    const results = await executor.executeApproved(session, tenantId, userId);

    const updated: IntakeSession = {
      ...session,
      status: 'automation_complete',
      automationResults: results,
      updatedAt: new Date().toISOString(),
    };
    intakeSessionStorage.save(updated);
    intakeSessionStorage.appendAudit(updated, createAuditRecord('automation_executed', {
      userId,
      automationActions: results.map((r) => r.action),
      details: results.map((r) => r.message).join('; '),
    }));

    return results;
  }
}

export const automationExecutionService = new AutomationExecutionService();
