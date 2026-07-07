import type { IUnitOfWork } from '../../domain/repositories/IRepository';
import type { CaseContext, CopilotScope } from '../../domain/ai/CaseContext';
import { buildClientTimeline, buildCaseTimeline } from '../../lib/entityTimeline';
import { intakeSessionStorage } from '../../infrastructure/ai/storage/intakeSessionStorage';

function iso(d: Date | string | undefined): string | undefined {
  if (!d) return undefined;
  return new Date(d).toISOString();
}

function computeFingerprint(parts: string[]): string {
  return parts.filter(Boolean).join('|');
}

export async function buildCaseContext(
  repos: IUnitOfWork,
  tenantId: string,
  scope: CopilotScope,
): Promise<CaseContext> {
  const client = await repos.clients.getById(scope.clientId);
  if (!client) throw new Error('Client not found.');

  const allCases = await repos.cases.getByClient(tenantId, scope.clientId);
  const cases = scope.type === 'case'
    ? allCases.filter((c) => c.id === scope.caseId)
    : allCases;

  if (scope.type === 'case' && cases.length === 0) {
    throw new Error('Case not found for this client.');
  }

  const caseIds = new Set(cases.map((c) => c.id));
  const entityIds = [scope.clientId, ...caseIds];

  const [
    clientDocuments,
    clientDeadlines,
    clientAppointments,
    clientInvoices,
    clientNotes,
    clientActivities,
    allTasks,
    allIntake,
  ] = await Promise.all([
    repos.documents.getByClient(tenantId, scope.clientId),
    repos.deadlines.getByClient(tenantId, scope.clientId),
    repos.appointments.getByClient(tenantId, scope.clientId),
    repos.invoices.getByClient(tenantId, scope.clientId),
    repos.clientNotes.getAll(tenantId).then((n) => n.filter((x) => x.clientId === scope.clientId)),
    repos.activities.getByEntity(tenantId, scope.clientId),
    repos.tasks.getAll(tenantId),
    Promise.resolve(intakeSessionStorage.getAll(tenantId)),
  ]);

  const caseDocuments = scope.type === 'case' && scope.caseId
    ? await repos.documents.getByCase(tenantId, scope.caseId)
    : [];
  const caseDeadlines = scope.type === 'case' && scope.caseId
    ? await repos.deadlines.getByCase(tenantId, scope.caseId)
    : [];

  const documents = scope.type === 'case'
    ? caseDocuments
    : clientDocuments;

  const deadlines = scope.type === 'case'
    ? [...caseDeadlines, ...clientDeadlines.filter((d) => !d.relatedEntityId || d.relatedEntityId === scope.clientId)]
    : clientDeadlines;

  const tasks = allTasks.filter((t) =>
    entityIds.some((id) => t.relatedEntityId === id),
  );

  const caseActivities = scope.type === 'case' && scope.caseId
    ? await repos.activities.getByEntity(tenantId, scope.caseId)
    : [];

  const activities = [...clientActivities, ...caseActivities];

  const appointments = clientAppointments.filter((a) =>
    scope.type === 'client' || !a.caseId || a.caseId === scope.caseId,
  );

  const invoices = clientInvoices.filter((inv) =>
    scope.type === 'client' || !inv.caseId || inv.caseId === scope.caseId,
  );

  const timelineEvents = scope.type === 'case' && cases[0]
    ? buildCaseTimeline({
        caseItem: cases[0],
        documents,
        invoices,
        deadlines,
        appointments,
        activities,
      })
    : buildClientTimeline({
        client,
        cases: allCases,
        documents: clientDocuments,
        invoices: clientInvoices,
        deadlines: clientDeadlines,
        appointments: clientAppointments,
        activities: clientActivities,
        notes: clientNotes,
      });

  const clientNameLower = client.name.toLowerCase();
  const intakeSessions = allIntake
    .filter((s) => {
      const fieldName = s.extractedFields.clientName?.value?.toLowerCase() ?? '';
      return fieldName.includes(clientNameLower) || clientNameLower.includes(fieldName);
    })
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      fileName: s.file.fileName,
      status: s.status,
      documentType: s.classification?.documentType,
      summary: s.recommendations.caseSummary || s.recommendations.plainEnglishSummary,
      riskLevel: s.aiMetadata?.riskLevel ?? s.recommendations.riskLevel,
      createdAt: s.createdAt,
    }));

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const now = Date.now();
  const overdueCount = invoices.filter(
    (i) => i.status === 'Overdue' || (i.status !== 'Paid' && new Date(i.dueDate).getTime() < now),
  ).length;

  const fingerprint = computeFingerprint([
    client.updatedAt.toISOString(),
    ...cases.map((c) => c.updatedAt.toISOString()),
    String(documents.length),
    String(tasks.length),
    String(deadlines.length),
    String(invoices.length),
    String(intakeSessions.length),
    String(timelineEvents.length),
  ]);

  return {
    scope,
    tenantId,
    fingerprint,
    builtAt: new Date().toISOString(),
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      nationality: client.nationality,
      immigrationStatus: client.immigrationStatus,
      aNumber: client.aNumber,
      passportNumber: client.passportNumber,
      notes: client.notes,
      updatedAt: client.updatedAt.toISOString(),
    },
    cases: cases.map((c) => ({
      id: c.id,
      name: c.name,
      caseType: c.caseType,
      stage: c.stage,
      uscisReceiptNumber: c.uscisReceiptNumber,
      filingDate: iso(c.filingDate),
      filingDeadline: iso(c.filingDeadline),
      currentStatus: c.currentStatus,
      assignedAttorney: c.assignedAttorney,
      notes: c.notes,
      updatedAt: c.updatedAt.toISOString(),
    })),
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      status: d.status,
      caseId: d.caseId,
      createdAt: d.createdAt.toISOString(),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: iso(t.dueDate),
      type: t.type,
    })),
    deadlines: deadlines.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      date: d.date.toISOString(),
      status: d.status,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      amount: i.amount,
      paidAmount: i.paidAmount,
      status: i.status,
      dueDate: i.dueDate.toISOString(),
      type: i.type,
    })),
    notes: clientNotes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })),
    intakeSessions,
    timelineEvents: timelineEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date.toISOString(),
      type: e.type,
    })),
    billingSummary: {
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
      overdueCount,
    },
  };
}

export function serializeContextForPrompt(context: CaseContext): string {
  return JSON.stringify(context, null, 0).slice(0, 100_000);
}
