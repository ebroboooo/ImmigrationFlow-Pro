import type { IUnitOfWork } from '../domain/repositories/IRepository';

export type SearchCategory =
  | 'Client'
  | 'Case'
  | 'Document'
  | 'Invoice'
  | 'Task'
  | 'Deadline'
  | 'Note'
  | 'Page';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  label: string;
  sublabel: string;
  path: string;
  keywords?: string;
}

const NAV_PAGES: SearchResultItem[] = [
  { id: 'nav-dashboard', category: 'Page', label: 'Dashboard', sublabel: 'Overview', path: '/', keywords: 'home overview' },
  { id: 'nav-clients', category: 'Page', label: 'Clients', sublabel: 'Client management', path: '/clients', keywords: 'clients people' },
  { id: 'nav-cases', category: 'Page', label: 'Cases', sublabel: 'Immigration cases', path: '/cases', keywords: 'cases uscis' },
  { id: 'nav-documents', category: 'Page', label: 'Documents', sublabel: 'Document management', path: '/documents', keywords: 'files upload' },
  { id: 'nav-ai-intake', category: 'Page', label: 'AI Intake', sublabel: 'Intelligent document intake', path: '/ai-intake', keywords: 'ai intake assistant upload' },
  { id: 'nav-billing', category: 'Page', label: 'Billing', sublabel: 'Invoices & payments', path: '/billing', keywords: 'invoices billing payments' },
  { id: 'nav-tasks', category: 'Page', label: 'Tasks', sublabel: 'Task management', path: '/tasks', keywords: 'tasks todo' },
  { id: 'nav-deadlines', category: 'Page', label: 'Deadlines', sublabel: 'Upcoming deadlines', path: '/deadlines', keywords: 'deadlines dates' },
  { id: 'nav-calendar', category: 'Page', label: 'Calendar', sublabel: 'Appointments', path: '/calendar', keywords: 'calendar schedule' },
  { id: 'nav-reports', category: 'Page', label: 'Reports', sublabel: 'Analytics', path: '/reports', keywords: 'reports analytics' },
  { id: 'nav-settings', category: 'Page', label: 'Settings', sublabel: 'Preferences', path: '/settings', keywords: 'settings profile' },
  { id: 'nav-notifications', category: 'Page', label: 'Notifications', sublabel: 'Notification center', path: '/notifications', keywords: 'notifications alerts' },
];

export async function searchApplication(
  repos: IUnitOfWork,
  tenantId: string,
  query: string,
): Promise<SearchResultItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return NAV_PAGES.slice(0, 6);

  const [clients, cases, documents, invoices, tasks, deadlines, notes] = await Promise.all([
    repos.clients.getAll(tenantId),
    repos.cases.getAll(tenantId),
    repos.documents.getAll(tenantId),
    repos.invoices.getAll(tenantId),
    repos.tasks.getAll(tenantId),
    repos.deadlines.getAll(tenantId),
    repos.clientNotes.getAll(tenantId),
  ]);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const results: SearchResultItem[] = [];

  for (const c of clients) {
    const hay = `${c.name} ${c.email ?? ''} ${c.aNumber ?? ''} ${c.nationality ?? ''}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: c.id,
        category: 'Client',
        label: c.name,
        sublabel: c.immigrationStatus ?? 'Client',
        path: '/clients',
        keywords: hay,
      });
    }
  }

  for (const c of cases) {
    const hay = `${c.name} ${c.caseType} ${c.stage} ${c.uscisReceiptNumber ?? ''}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: c.id,
        category: 'Case',
        label: c.name,
        sublabel: `${c.caseType} · ${c.stage}`,
        path: '/cases',
        keywords: hay,
      });
    }
  }

  for (const d of documents) {
    const hay = `${d.name} ${d.category} ${clientMap.get(d.clientId) ?? ''}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: d.id,
        category: 'Document',
        label: d.name,
        sublabel: `${d.category} · ${clientMap.get(d.clientId) ?? 'Client'}`,
        path: '/documents',
        keywords: hay,
      });
    }
  }

  for (const inv of invoices) {
    const hay = `${inv.type} ${inv.status} ${clientMap.get(inv.clientId) ?? ''}`.toLowerCase();
    if (hay.includes(q) || String(inv.amount).includes(q)) {
      results.push({
        id: inv.id,
        category: 'Invoice',
        label: `${inv.type} — $${inv.amount}`,
        sublabel: `${inv.status} · ${clientMap.get(inv.clientId) ?? 'Client'}`,
        path: '/billing',
        keywords: hay,
      });
    }
  }

  for (const t of tasks) {
    const hay = `${t.title} ${t.type} ${t.status}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: t.id,
        category: 'Task',
        label: t.title,
        sublabel: `${t.type} · ${t.status}`,
        path: '/tasks',
        keywords: hay,
      });
    }
  }

  for (const d of deadlines) {
    const hay = `${d.title} ${d.type}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: d.id,
        category: 'Deadline',
        label: d.title,
        sublabel: d.type,
        path: '/deadlines',
        keywords: hay,
      });
    }
  }

  for (const n of notes) {
    const hay = `${n.content} ${clientMap.get(n.clientId) ?? ''}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: n.id,
        category: 'Note',
        label: n.content.slice(0, 60) + (n.content.length > 60 ? '…' : ''),
        sublabel: clientMap.get(n.clientId) ?? 'Client note',
        path: '/clients',
        keywords: hay,
      });
    }
  }

  for (const page of NAV_PAGES) {
    const hay = `${page.label} ${page.sublabel} ${page.keywords ?? ''}`.toLowerCase();
    if (hay.includes(q)) results.push(page);
  }

  return results.slice(0, 20);
}

export const RECENT_SEARCHES_KEY = 'immflow_recent_searches';

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecentSearches().filter((s) => s !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 8)));
}
