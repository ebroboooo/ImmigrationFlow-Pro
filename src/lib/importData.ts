import type { IRepository, IUnitOfWork } from '../domain/repositories/IRepository';

export interface ExportPayload {
  exportedAt?: string;
  tenantId?: string;
  data: Record<string, Array<Record<string, unknown>>>;
}

const DATE_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'date', 'startTime', 'endTime', 'filingDate', 'priorityDate', 'filingDeadline', 'expectedCloseDate', 'lastActivityDate'];

function reviveDates<T extends Record<string, unknown>>(item: T): T {
  const out = { ...item } as Record<string, unknown>;
  for (const key of DATE_FIELDS) {
    if (key in out && typeof out[key] === 'string') {
      out[key] = new Date(out[key] as string);
    }
  }
  return out as T;
}

interface UpsertCapable<T> {
  upsert(item: T): Promise<T>;
}

async function upsertMany<T extends { id: string; tenantId?: string }>(
  repo: IRepository<T>,
  items: T[],
  tenantId: string,
): Promise<number> {
  const upsertRepo = repo as IRepository<T> & UpsertCapable<T>;
  let count = 0;
  for (const raw of items) {
    const item = reviveDates(raw as Record<string, unknown>) as T;
    const withTenant = { ...item, tenantId: item.tenantId ?? tenantId };
    if (typeof upsertRepo.upsert === 'function') {
      await upsertRepo.upsert(withTenant);
    } else {
      const existing = await repo.getById(item.id);
      if (existing) await repo.update(item.id, withTenant);
    }
    count += 1;
  }
  return count;
}

export async function importTenantData(repos: IUnitOfWork, tenantId: string, payload: ExportPayload): Promise<number> {
  const d = payload.data;
  const pairs: [keyof IUnitOfWork, Array<Record<string, unknown>> | undefined][] = [
    ['clients', d.clients],
    ['leads', d.leads],
    ['cases', d.cases],
    ['tasks', d.tasks],
    ['activities', d.activities],
    ['documents', d.documents],
    ['invoices', d.invoices],
    ['deadlines', d.deadlines],
    ['appointments', d.appointments],
    ['notifications', d.notifications],
    ['clientNotes', d.clientNotes],
    ['services', d.services],
  ];

  let total = 0;
  for (const [key, items] of pairs) {
    if (!items?.length) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    total += await upsertMany(repos[key] as IRepository<any>, items as any[], tenantId);
  }
  return total;
}

export function parseImportFile(text: string): ExportPayload {
  const parsed = JSON.parse(text) as ExportPayload;
  if (!parsed?.data || typeof parsed.data !== 'object') {
    throw new Error('Invalid backup file format.');
  }
  return parsed;
}
