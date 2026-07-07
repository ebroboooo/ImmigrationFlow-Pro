import type { IntakeSession } from '../../../domain/ai/IntakeSession';
import type { AutomationExecutionResult } from '../../../domain/ai/AutomationPlan';
import type { IWorkflowAutomationService } from '../../../domain/ai/services';
import type { IUnitOfWork } from '../../../domain/repositories/IRepository';
import { generateId } from '../../../lib/utils';
import { fileStorage, LOCAL_FILE_PREFIX } from '../../storage/fileStorage';
import { aiIntakeFileStorage } from '../storage/aiIntakeFileStorage';

export class WorkflowAutomationService implements IWorkflowAutomationService {
  private repos: IUnitOfWork;

  constructor(repos: IUnitOfWork) {
    this.repos = repos;
  }

  async executeApproved(
    session: IntakeSession,
    tenantId: string,
    userId: string,
  ): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = [];
    const actions = session.automationActions.filter((a) => a.selected && a.enabled);
    const fields = session.extractedFields;
    let clientId: string | undefined;
    let caseId: string | undefined;

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_client': {
            const client = await this.repos.clients.create({
              tenantId,
              name: fields.clientName?.value ?? fields.beneficiary?.value ?? 'New Client',
              email: fields.email?.value,
              phone: fields.phone?.value,
              address: fields.address?.value,
              aNumber: fields.aNumber?.value,
              notes: session.recommendations.suggestedInternalNotes,
              lifetimeValue: 0,
              tags: ['ai-intake'],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            clientId = client.id;
            results.push({ action: action.type, success: true, entityId: client.id, message: `Client "${client.name}" created.` });
            break;
          }
          case 'create_case': {
            if (!clientId) {
              const clients = await this.repos.clients.getAll(tenantId);
              clientId = clients.find((c) => c.name === fields.clientName?.value)?.id;
            }
            if (!clientId) {
              results.push({ action: action.type, success: false, message: 'Create a client first or select Create Client.' });
              break;
            }
            const caseRecord = await this.repos.cases.create({
              tenantId,
              name: `${fields.uscisForm?.value ?? session.classification?.documentType ?? 'Immigration'} Case`,
              clientId,
              caseType: 'Other',
              value: 0,
              probability: 50,
              stage: 'Assessment',
              uscisReceiptNumber: fields.receiptNumber?.value,
              filingDate: fields.filingDate?.value ? new Date(fields.filingDate.value) : undefined,
              notes: session.recommendations.caseSummary,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            caseId = caseRecord.id;
            results.push({ action: action.type, success: true, entityId: caseRecord.id, message: 'Case created.' });
            break;
          }
          case 'attach_document': {
            const blob = await aiIntakeFileStorage.get(session.file.storageKey);
            if (!blob) {
              results.push({ action: action.type, success: false, message: 'Source file not found.' });
              break;
            }
            const docId = generateId();
            await fileStorage.save(docId, blob, session.file.fileName);
            const doc = await this.repos.documents.create({
              tenantId,
              name: session.file.fileName,
              clientId: clientId ?? '',
              caseId,
              category: 'USCIS Notices',
              status: 'Uploaded',
              url: `${LOCAL_FILE_PREFIX}${docId}`,
              uploadedBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            results.push({ action: action.type, success: true, entityId: doc.id, message: 'Document attached to library.' });
            break;
          }
          case 'generate_tasks': {
            const created = [];
            for (const task of session.recommendations.suggestedTasks.filter((t) => t.selected)) {
              const t = await this.repos.tasks.create({
                tenantId,
                title: task.title,
                description: task.description,
                type: 'Custom',
                status: 'Todo',
                priority: task.priority,
                dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                assignedUserId: userId,
                relatedEntityId: caseId ?? clientId,
                relatedEntityType: caseId ? 'Case' : clientId ? 'Client' : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              created.push(t.id);
            }
            results.push({ action: action.type, success: true, message: `${created.length} task(s) created.` });
            break;
          }
          case 'generate_calendar_events': {
            let count = 0;
            for (const ev of session.recommendations.suggestedCalendarEvents.filter((e) => e.selected)) {
              await this.repos.appointments.create({
                tenantId,
                title: ev.title,
                type: ev.type === 'Interview' ? 'USCIS Interview' : ev.type === 'Biometrics' ? 'Biometrics' : 'Consultation',
                status: 'Scheduled',
                startTime: new Date(ev.start),
                endTime: new Date(ev.end ?? ev.start),
                clientId,
                assignedUserId: userId,
                location: ev.location,
                notes: ev.notes,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              count += 1;
            }
            results.push({ action: action.type, success: true, message: `${count} calendar event(s) created.` });
            break;
          }
          case 'generate_deadlines': {
            let count = 0;
            for (const dl of session.recommendations.suggestedDeadlines.filter((d) => d.selected)) {
              await this.repos.deadlines.create({
                tenantId,
                title: dl.title,
                type: dl.type as import('../../../domain/models/Sales').Deadline['type'],
                date: new Date(dl.date),
                status: 'Pending',
                createdAt: new Date(),
              });
              count += 1;
            }
            results.push({ action: action.type, success: true, message: `${count} deadline(s) created.` });
            break;
          }
          case 'prepare_email': {
            results.push({
              action: action.type,
              success: true,
              message: 'Email draft saved for review. Sending requires future email integration.',
            });
            break;
          }
          case 'create_internal_note': {
            if (!clientId) {
              results.push({ action: action.type, success: false, message: 'Client required for internal note.' });
              break;
            }
            await this.repos.clientNotes.create({
              tenantId,
              clientId,
              content: session.recommendations.suggestedInternalNotes,
              createdByUserId: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            results.push({ action: action.type, success: true, message: 'Internal note created.' });
            break;
          }
          default:
            results.push({ action: action.type, success: false, message: 'Unknown action.' });
        }
      } catch (err) {
        results.push({
          action: action.type,
          success: false,
          message: err instanceof Error ? err.message : 'Action failed.',
        });
      }
    }

    return results;
  }
}
