const CRM_STORAGE_KEYS = [
  'clientflow_users',
  'clientflow_tenants',
  'clientflow_clients',
  'clientflow_leads',
  'clientflow_cases',
  'clientflow_tasks',
  'clientflow_activities',
  'clientflow_services',
  'clientflow_clientNotes',
  'clientflow_notifications',
  'clientflow_auditLogs',
  'clientflow_documents',
  'clientflow_invoices',
  'clientflow_deadlines',
  'clientflow_appointments',
];

export interface StorageSnapshot {
  id: string;
  createdAt: string;
  data: Record<string, string | null>;
}

export function createStorageSnapshot(): StorageSnapshot {
  const data: Record<string, string | null> = {};
  for (const key of CRM_STORAGE_KEYS) {
    data[key] = localStorage.getItem(key);
  }
  return {
    id: `snapshot-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data,
  };
}

export function restoreStorageSnapshot(snapshot: StorageSnapshot): void {
  for (const key of CRM_STORAGE_KEYS) {
    const value = snapshot.data[key];
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }
}
