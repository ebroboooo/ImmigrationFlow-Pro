import { generateId } from '../../lib/utils';
import type {
  ImportOptions,
  ImportProgress,
  ImportReport,
  ImportReportEntry,
  MigrationPreview,
  ZipDocumentEntry,
} from '../../domain/import/MigrationTypes';
import type { Client, Lead } from '../../domain/models/CRM';
import type { Case, Task, Deadline, Appointment, Invoice, Document, Activity } from '../../domain/models/Sales';
import { mockRepositories } from '../../infrastructure/repositories/MockRepositoryFactory';
import {
  createStorageSnapshot,
  restoreStorageSnapshot,
  reloadRepositoriesAfterRollback,
} from '../../infrastructure/import/transaction/migrationTransactionManager';
import { fileStorage, LOCAL_FILE_PREFIX } from '../../infrastructure/storage/fileStorage';
import { CHUNK_SIZE } from './migrationEntityBuilder';

export interface ImportExecutionOptions {
  tenantId: string;
  userId: string;
  preview: MigrationPreview;
  options: ImportOptions;
  zipDocuments: ZipDocumentEntry[];
  onProgress?: (progress: ImportProgress) => void;
  signal?: AbortSignal;
}

function parseDate(val?: string): Date | undefined {
  if (!val?.trim()) return undefined;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeCaseType(raw?: string): Case['caseType'] {
  const types: Case['caseType'][] = ['I-130', 'Adjustment of Status', 'H1B', 'EB2', 'EB3', 'F1', 'OPT', 'B1', 'B2', 'N400', 'Green Card', 'Asylum', 'Removal Defense', 'Waivers', 'Other'];
  if (!raw) return 'Other';
  const match = types.find((t) => t.toLowerCase() === raw.toLowerCase() || raw.toLowerCase().includes(t.toLowerCase()));
  return match ?? 'Other';
}

function normalizeStage(raw?: string): Case['stage'] {
  const stages: Case['stage'][] = ['Assessment', 'Preparation', 'Filed', 'Pending USCIS', 'RFE Received', 'Approved', 'Denied', 'Closed'];
  if (!raw) return 'Assessment';
  const match = stages.find((s) => s.toLowerCase() === raw.toLowerCase() || raw.toLowerCase().includes(s.toLowerCase()));
  return match ?? 'Assessment';
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function executeMigrationImport(opts: ImportExecutionOptions): Promise<ImportReport> {
  const startedAt = new Date().toISOString();
  const entries: ImportReportEntry[] = [];
  let imported = 0;
  let skipped = 0;
  let merged = 0;
  let updated = 0;
  let errors = 0;
  const missingDocuments: string[] = [];
  const duplicateSummary: string[] = [];
  const clientIdMap = new Map<string, string>();
  const caseIdMap = new Map<string, string>();

  const total =
    opts.preview.clients.length +
    opts.preview.leads.length +
    opts.preview.cases.length +
    opts.preview.tasks.length +
    opts.preview.deadlines.length +
    opts.preview.appointments.length +
    opts.preview.invoices.length +
    opts.preview.documents.length;

  let processed = 0;

  const reportProgress = (phase: ImportProgress['phase'], message: string) => {
    processed = Math.min(processed + 1, total);
    opts.onProgress?.({
      phase,
      processed,
      total,
      message,
      percent: total > 0 ? Math.round((processed / total) * 100) : 0,
    });
  };

  const snapshot = createStorageSnapshot();

  try {
    if (opts.signal?.aborted) throw new Error('Import cancelled.');

    reportProgress('preparing', 'Creating backup snapshot for rollback…');

    if (opts.options.createClients) {
      for (let i = 0; i < opts.preview.clients.length; i += CHUNK_SIZE) {
        if (opts.signal?.aborted) throw new Error('Import cancelled.');
        const chunk = opts.preview.clients.slice(i, i + CHUNK_SIZE);
        for (const pc of chunk) {
          const action = pc.duplicateAction ?? (pc.isDuplicate ? 'skip' : 'create_new');
          if (action === 'skip' || (opts.options.skipDuplicates && pc.isDuplicate)) {
            skipped += 1;
            entries.push({ entityType: 'client', action: 'skipped', label: pc.name, message: 'Duplicate skipped' });
            duplicateSummary.push(`Skipped client: ${pc.name}`);
            if (pc.existingId) clientIdMap.set(pc.key, pc.existingId);
            continue;
          }
          if (action === 'update_existing' && pc.existingId) {
            await mockRepositories.clients.update(pc.existingId, {
              email: pc.email,
              phone: pc.phone,
              address: pc.address,
              nationality: pc.nationality,
              aNumber: pc.aNumber,
            });
            clientIdMap.set(pc.key, pc.existingId);
            updated += 1;
            entries.push({ entityType: 'client', action: 'updated', label: pc.name });
            continue;
          }
          const now = new Date();
          const client: Omit<Client, 'id'> = {
            tenantId: opts.tenantId,
            name: pc.name,
            email: pc.email,
            phone: pc.phone,
            address: pc.address,
            nationality: pc.nationality,
            aNumber: pc.aNumber,
            notes: '',
            lifetimeValue: 0,
            tags: ['imported'],
            immigrationStatus: 'New Lead',
            createdAt: now,
            updatedAt: now,
          };
          const created = await mockRepositories.clients.create(client);
          clientIdMap.set(pc.key, created.id);
          imported += 1;
          entries.push({ entityType: 'client', action: 'imported', label: pc.name });
        }
        reportProgress('clients', `Imported clients ${Math.min(i + CHUNK_SIZE, opts.preview.clients.length)}/${opts.preview.clients.length}`);
        await delay(0);
      }
    }

    if (opts.options.createLeads) {
      for (const pl of opts.preview.leads) {
        const action = pl.duplicateAction ?? (pl.isDuplicate ? 'skip' : 'create_new');
        if (action === 'skip') {
          skipped += 1;
          entries.push({ entityType: 'lead', action: 'skipped', label: pl.name });
          continue;
        }
        const now = new Date();
        const lead: Omit<Lead, 'id'> = {
          tenantId: opts.tenantId,
          name: pl.name,
          email: pl.email,
          phone: pl.phone,
          company: pl.company,
          source: 'Manual Entry',
          tags: ['imported'],
          notes: '',
          status: 'New Lead',
          createdAt: now,
          updatedAt: now,
        };
        await mockRepositories.leads.create(lead);
        imported += 1;
        entries.push({ entityType: 'lead', action: 'imported', label: pl.name });
      }
      reportProgress('leads', 'Leads imported');
    }

    if (opts.options.createCases) {
      for (const pc of opts.preview.cases) {
        const action = pc.duplicateAction ?? (pc.isDuplicate ? 'skip' : 'create_new');
        if (action === 'skip') {
          skipped += 1;
          if (pc.existingId) caseIdMap.set(pc.key, pc.existingId);
          entries.push({ entityType: 'case', action: 'skipped', label: pc.name });
          continue;
        }
        if (action === 'update_existing' && pc.existingId) {
          await mockRepositories.cases.update(pc.existingId, {
            uscisReceiptNumber: pc.uscisReceiptNumber,
            priorityDate: parseDate(pc.priorityDate),
            currentStatus: pc.currentStatus,
            assignedAttorney: pc.assignedAttorney,
          });
          caseIdMap.set(pc.key, pc.existingId);
          updated += 1;
          entries.push({ entityType: 'case', action: 'updated', label: pc.name });
          continue;
        }
        const clientId = clientIdMap.get(pc.clientKey);
        if (!clientId) {
          errors += 1;
          entries.push({ entityType: 'case', action: 'error', label: pc.name, message: 'Missing client reference' });
          continue;
        }
        const now = new Date();
        const caseItem: Omit<Case, 'id'> = {
          tenantId: opts.tenantId,
          name: pc.name,
          clientId,
          caseType: normalizeCaseType(pc.caseType),
          value: 0,
          probability: 50,
          stage: normalizeStage(pc.stage),
          uscisReceiptNumber: pc.uscisReceiptNumber,
          priorityDate: parseDate(pc.priorityDate),
          currentStatus: pc.currentStatus,
          assignedAttorney: pc.assignedAttorney,
          notes: '',
          createdAt: now,
          updatedAt: now,
        };
        const created = await mockRepositories.cases.create(caseItem);
        caseIdMap.set(pc.key, created.id);
        imported += 1;
        entries.push({ entityType: 'case', action: 'imported', label: pc.name });
      }
      reportProgress('cases', 'Cases imported');
    }

    if (opts.options.createTasks) {
      for (const pt of opts.preview.tasks) {
        const now = new Date();
        const clientId = pt.relatedClientKey ? clientIdMap.get(pt.relatedClientKey) : undefined;
        const task: Omit<Task, 'id'> = {
          tenantId: opts.tenantId,
          title: pt.title,
          description: pt.description ?? '',
          type: 'Custom',
          status: 'Todo',
          priority: 'Medium',
          dueDate: parseDate(pt.dueDate),
          relatedEntityId: clientId ?? pt.relatedCaseKey ? caseIdMap.get(pt.relatedCaseKey ?? '') : undefined,
          relatedEntityType: clientId ? 'Client' : pt.relatedCaseKey ? 'Case' : undefined,
          createdAt: now,
          updatedAt: now,
        };
        await mockRepositories.tasks.create(task);
        imported += 1;
        entries.push({ entityType: 'task', action: 'imported', label: pt.title });
      }
      reportProgress('tasks', 'Tasks imported');
    }

    if (opts.options.createDeadlines) {
      for (const pd of opts.preview.deadlines) {
        const now = new Date();
        const clientId = pd.relatedClientKey ? clientIdMap.get(pd.relatedClientKey) : undefined;
        const deadline: Omit<Deadline, 'id'> = {
          tenantId: opts.tenantId,
          title: pd.title,
          type: 'USCIS Deadline',
          date: parseDate(pd.date) ?? now,
          relatedEntityId: clientId,
          relatedEntityType: clientId ? 'Client' : undefined,
          status: 'Pending',
          createdAt: now,
        };
        await mockRepositories.deadlines.create(deadline);
        imported += 1;
        entries.push({ entityType: 'deadline', action: 'imported', label: pd.title });
      }
      reportProgress('deadlines', 'Deadlines imported');
    }

    if (opts.options.createAppointments) {
      for (const pa of opts.preview.appointments) {
        const now = new Date();
        const start = parseDate(pa.startTime) ?? now;
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const clientId = pa.relatedClientKey ? clientIdMap.get(pa.relatedClientKey) : undefined;
        const appt: Omit<Appointment, 'id'> = {
          tenantId: opts.tenantId,
          title: pa.title,
          type: 'Consultation',
          status: 'Scheduled',
          startTime: start,
          endTime: end,
          clientId,
          caseId: pa.relatedCaseKey ? caseIdMap.get(pa.relatedCaseKey) : undefined,
          notes: '',
          createdAt: now,
          updatedAt: now,
        };
        await mockRepositories.appointments.create(appt);
        imported += 1;
        entries.push({ entityType: 'appointment', action: 'imported', label: pa.title });
      }
      reportProgress('appointments', 'Appointments imported');
    }

    if (opts.options.createInvoices) {
      for (const pi of opts.preview.invoices) {
        const clientId = clientIdMap.get(pi.clientKey);
        if (!clientId) {
          errors += 1;
          continue;
        }
        const now = new Date();
        const invoice: Omit<Invoice, 'id'> = {
          tenantId: opts.tenantId,
          clientId,
          amount: pi.amount,
          paidAmount: pi.paidAmount ?? 0,
          type: 'Flat Fee',
          status: pi.paidAmount && pi.paidAmount >= pi.amount ? 'Paid' : 'Draft',
          dueDate: parseDate(pi.dueDate) ?? now,
          createdAt: now,
          updatedAt: now,
        };
        await mockRepositories.invoices.create(invoice);
        imported += 1;
        entries.push({ entityType: 'invoice', action: 'imported', label: `$${pi.amount}` });
      }
      reportProgress('invoices', 'Invoices imported');
    }

    if (opts.options.createDocuments) {
      for (const pd of opts.preview.documents) {
        const clientId = pd.clientKey ? clientIdMap.get(pd.clientKey) : undefined;
        if (!clientId && pd.zipEntryId) {
          missingDocuments.push(pd.name);
          continue;
        }
        if (!clientId) {
          errors += 1;
          entries.push({ entityType: 'document', action: 'error', label: pd.name, message: 'No client link' });
          continue;
        }
        const now = new Date();
        let url: string | undefined;
        if (pd.zipEntryId) {
          const zipEntry = opts.zipDocuments.find((z) => z.id === pd.zipEntryId);
          if (zipEntry) {
            const docId = generateId();
            await fileStorage.save(docId, zipEntry.blob, zipEntry.fileName);
            url = `${LOCAL_FILE_PREFIX}${docId}`;
          }
        }
        const doc: Omit<Document, 'id'> = {
          tenantId: opts.tenantId,
          clientId,
          caseId: pd.caseKey ? caseIdMap.get(pd.caseKey) : undefined,
          name: pd.name,
          category: (pd.category as Document['category']) ?? 'Other',
          status: url ? 'Uploaded' : 'Pending',
          url,
          uploadedBy: opts.userId,
          createdAt: now,
          updatedAt: now,
        };
        await mockRepositories.documents.create(doc);
        imported += 1;
        entries.push({ entityType: 'document', action: 'imported', label: pd.name });
      }
      reportProgress('documents', 'Documents imported');
    }

    if (opts.options.createActivities) {
      const activity: Omit<Activity, 'id'> = {
        tenantId: opts.tenantId,
        type: 'Case Update',
        description: `Migration import completed: ${imported} records`,
        relatedEntityId: opts.tenantId,
        relatedEntityType: 'Client',
        createdByUserId: opts.userId,
        createdAt: new Date(),
      };
      await mockRepositories.activities.create(activity);
    }

    reportProgress('complete', 'Migration complete');

    return {
      startedAt,
      completedAt: new Date().toISOString(),
      success: true,
      imported,
      skipped,
      merged,
      updated,
      errors,
      warnings: opts.preview.warnings.length,
      missingDocuments,
      duplicateSummary,
      entries,
    };
  } catch (err) {
    restoreStorageSnapshot(snapshot);
    reloadRepositoriesAfterRollback();
    const message = err instanceof Error ? err.message : 'Import failed';
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      success: false,
      imported: 0,
      skipped: 0,
      merged: 0,
      updated: 0,
      errors: errors + 1,
      warnings: opts.preview.warnings.length,
      missingDocuments,
      duplicateSummary,
      entries: [...entries, { entityType: 'client', action: 'error', label: 'Migration', message }],
      rollbackPerformed: true,
    };
  }
}

export function downloadImportReport(report: ImportReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `migration-report-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const migrationImportService = {
  execute: executeMigrationImport,
  downloadReport: downloadImportReport,
};
