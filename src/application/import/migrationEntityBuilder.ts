import type {
  ColumnMappingEntry,
  MigrationPreview,
  ParsedSpreadsheet,
  SpreadsheetColumnMapping,
} from '../../domain/import/MigrationTypes';

const CHUNK_SIZE = 500;

function getMappedValue(row: Record<string, string>, mappings: ColumnMappingEntry[], field: string): string | undefined {
  const mapping = mappings.find((m) => m.targetField === field);
  if (!mapping) return undefined;
  const val = row[mapping.sourceColumn]?.trim();
  return val || undefined;
}

function inferEntityHints(sheetName: string): { preferLead: boolean; preferCase: boolean; preferTask: boolean } {
  const lower = sheetName.toLowerCase();
  return {
    preferLead: /lead|prospect/i.test(lower),
    preferCase: /case|matter|petition|uscis/i.test(lower),
    preferTask: /task|todo|action/i.test(lower),
  };
}

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function clientKey(name: string, row: number, sheetId: string): string {
  return `client-${sheetId}-${row}-${normalizeName(name)}`;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

export function buildPreviewFromSpreadsheets(
  spreadsheets: ParsedSpreadsheet[],
  columnMappings: SpreadsheetColumnMapping[],
): MigrationPreview {
  const preview: MigrationPreview = {
    clients: [],
    leads: [],
    cases: [],
    tasks: [],
    deadlines: [],
    appointments: [],
    invoices: [],
    documents: [],
    duplicates: [],
    warnings: [],
    errors: [],
    estimatedSeconds: 0,
    totalRows: 0,
  };

  const clientKeyMap = new Map<string, string>();

  for (const sheet of spreadsheets) {
    const mapping = columnMappings.find((m) => m.spreadsheetId === sheet.id);
    if (!mapping) continue;
    const hints = inferEntityHints(sheet.sheetName);
    preview.totalRows += sheet.rowCount;

    for (let i = 0; i < sheet.rows.length; i++) {
      const row = sheet.rows[i];
      const rowNum = i + 2;

      const clientName = getMappedValue(row, mapping.mappings, 'clientName')
        ?? getMappedValue(row, mapping.mappings, 'beneficiary');
      const leadName = getMappedValue(row, mapping.mappings, 'leadName') ?? clientName;
      const email = getMappedValue(row, mapping.mappings, 'email');
      const phone = getMappedValue(row, mapping.mappings, 'phone');
      const receipt = getMappedValue(row, mapping.mappings, 'receiptNumber');
      const caseType = getMappedValue(row, mapping.mappings, 'caseType');
      const status = getMappedValue(row, mapping.mappings, 'status');
      const taskTitle = getMappedValue(row, mapping.mappings, 'taskTitle');
      const deadlineDate = getMappedValue(row, mapping.mappings, 'deadlineDate');
      const appointmentDate = getMappedValue(row, mapping.mappings, 'appointmentDate');
      const invoiceAmount = getMappedValue(row, mapping.mappings, 'invoiceAmount');
      const docName = getMappedValue(row, mapping.mappings, 'documentName');

      if (hints.preferLead && leadName) {
        preview.leads.push({
          key: `lead-${sheet.id}-${rowNum}`,
          name: leadName,
          email,
          phone,
          company: getMappedValue(row, mapping.mappings, 'company'),
          sourceRow: rowNum,
          spreadsheetId: sheet.id,
        });
      } else if (clientName) {
        const key = clientKey(clientName, rowNum, sheet.id);
        if (!clientKeyMap.has(normalizeName(clientName))) {
          clientKeyMap.set(normalizeName(clientName), key);
          preview.clients.push({
            key,
            name: clientName,
            email,
            phone,
            address: getMappedValue(row, mapping.mappings, 'address'),
            nationality: getMappedValue(row, mapping.mappings, 'country'),
            aNumber: getMappedValue(row, mapping.mappings, 'aNumber'),
            sourceRow: rowNum,
            spreadsheetId: sheet.id,
          });
        }
      }

      const ck = clientName ? clientKeyMap.get(normalizeName(clientName)) : undefined;

      if (receipt || caseType || hints.preferCase) {
        preview.cases.push({
          key: `case-${sheet.id}-${rowNum}`,
          name: caseType ? `${caseType} — ${clientName ?? 'Unknown'}` : `Case — ${clientName ?? receipt ?? rowNum}`,
          clientKey: ck ?? `orphan-${sheet.id}-${rowNum}`,
          caseType,
          stage: status,
          uscisReceiptNumber: receipt,
          priorityDate: getMappedValue(row, mapping.mappings, 'priorityDate'),
          currentStatus: status,
          assignedAttorney: getMappedValue(row, mapping.mappings, 'attorney'),
          sourceRow: rowNum,
          spreadsheetId: sheet.id,
        });
      }

      if (taskTitle || hints.preferTask) {
        preview.tasks.push({
          key: `task-${sheet.id}-${rowNum}`,
          title: taskTitle ?? `Imported task row ${rowNum}`,
          description: getMappedValue(row, mapping.mappings, 'notes'),
          dueDate: deadlineDate,
          relatedClientKey: ck,
          sourceRow: rowNum,
          spreadsheetId: sheet.id,
        });
      }

      if (deadlineDate) {
        preview.deadlines.push({
          key: `deadline-${sheet.id}-${rowNum}`,
          title: taskTitle ?? `Deadline row ${rowNum}`,
          date: deadlineDate,
          type: getMappedValue(row, mapping.mappings, 'biometricsDate') ? 'Biometrics' : 'USCIS Deadline',
          relatedClientKey: ck,
          sourceRow: rowNum,
          spreadsheetId: sheet.id,
        });
      }

      if (appointmentDate) {
        preview.appointments.push({
          key: `appt-${sheet.id}-${rowNum}`,
          title: taskTitle ?? `Appointment row ${rowNum}`,
          startTime: appointmentDate,
          relatedClientKey: ck,
          sourceRow: rowNum,
          spreadsheetId: sheet.id,
        });
      }

      if (invoiceAmount) {
        const amount = parseAmount(invoiceAmount);
        if (amount > 0 && ck) {
          preview.invoices.push({
            key: `invoice-${sheet.id}-${rowNum}`,
            clientKey: ck,
            amount,
            paidAmount: parseAmount(getMappedValue(row, mapping.mappings, 'payment')),
            dueDate: deadlineDate,
            sourceRow: rowNum,
            spreadsheetId: sheet.id,
          });
        }
      }

      if (docName) {
        preview.documents.push({
          key: `doc-${sheet.id}-${rowNum}`,
          name: docName,
          clientKey: ck,
          category: 'Other',
          sourceRow: rowNum,
          spreadsheetId: sheet.id,
        });
      }
    }
  }

  preview.estimatedSeconds = Math.max(5, Math.ceil(preview.totalRows / CHUNK_SIZE) * 2);
  return preview;
}

export function estimateImportTime(preview: MigrationPreview): number {
  const total =
    preview.clients.length +
    preview.leads.length +
    preview.cases.length +
    preview.tasks.length +
    preview.deadlines.length +
    preview.appointments.length +
    preview.invoices.length +
    preview.documents.length;
  return Math.max(5, Math.ceil(total / CHUNK_SIZE) * 2);
}

export { CHUNK_SIZE };
