import type { IUnitOfWork } from '../domain/repositories/IRepository';

export async function exportTenantData(repos: IUnitOfWork, tenantId: string) {
  const [
    tenants, users, clients, leads, cases, tasks, activities, services,
    clientNotes, notifications, auditLogs, documents, invoices, deadlines, appointments,
  ] = await Promise.all([
    repos.tenants.getAll(tenantId),
    repos.users.getAll(tenantId),
    repos.clients.getAll(tenantId),
    repos.leads.getAll(tenantId),
    repos.cases.getAll(tenantId),
    repos.tasks.getAll(tenantId),
    repos.activities.getAll(tenantId),
    repos.services.getAll(tenantId),
    repos.clientNotes.getAll(tenantId),
    repos.notifications.getAll(tenantId),
    repos.auditLogs.getAll(tenantId),
    repos.documents.getAll(tenantId),
    repos.invoices.getAll(tenantId),
    repos.deadlines.getAll(tenantId),
    repos.appointments.getAll(tenantId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    data: {
      tenants, users, clients, leads, cases, tasks, activities, services,
      clientNotes, notifications, auditLogs, documents, invoices, deadlines, appointments,
    },
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
