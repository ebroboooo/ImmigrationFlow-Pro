import type { IUnitOfWork, IUserRepository, IClientRepository, ICaseRepository, ITaskRepository, IActivityRepository, INotificationRepository, IAuditLogRepository, IDocumentRepository, IInvoiceRepository, IDeadlineRepository, IAppointmentRepository } from '../../domain/repositories/IRepository';
import type { User, Tenant } from '../../domain/models/User';
import type { Lead, Client, Service, ClientNote } from '../../domain/models/CRM';
import type { Case, Task, Activity, Notification, AuditLog, Document, Invoice, Deadline, Appointment } from '../../domain/models/Sales';
import { generateId } from '../../lib/utils';

class MockRepository<T extends { id: string }> {
  protected items: T[] = [];
  protected storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  protected loadFromStorage() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      this.items = JSON.parse(data, (_key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    }
  }

  protected saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  async getAll(tenantId: string): Promise<T[]> {
    return this.items.filter((i: any) => i.tenantId === tenantId);
  }

  async getById(id: string): Promise<T | null> {
    return this.items.find(i => i.id === id) || null;
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    const newItem = { ...item, id: generateId() } as T;
    this.items.push(newItem);
    this.saveToStorage();
    return newItem;
  }

  async update(id: string, item: Partial<T>): Promise<T> {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Not found');
    this.items[index] = { ...this.items[index], ...item };
    this.saveToStorage();
    return this.items[index];
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
    this.saveToStorage();
  }

  async clear(): Promise<void> {
    this.items = [];
    this.saveToStorage();
  }

  async clearAndSeed(items: T[]): Promise<void> {
    this.items = items;
    this.saveToStorage();
  }
}

class UserMockRepository extends MockRepository<User> implements IUserRepository {
  async getByEmail(email: string): Promise<User | null> {
    return this.items.find(i => i.email === email) || null;
  }
  async getByRole(tenantId: string, role: string): Promise<User[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.role === role);
  }
}

class ClientMockRepository extends MockRepository<Client> implements IClientRepository {
  async getByStatus(tenantId: string, status: string): Promise<Client[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.immigrationStatus === status);
  }
}

class CaseMockRepository extends MockRepository<Case> implements ICaseRepository {
  async getByClient(tenantId: string, clientId: string): Promise<Case[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.clientId === clientId);
  }
  async getByStage(tenantId: string, stage: string): Promise<Case[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.stage === stage);
  }
}

class TaskMockRepository extends MockRepository<Task> implements ITaskRepository {
  async getByUser(tenantId: string, userId: string): Promise<Task[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.assignedUserId === userId);
  }
  async getByEntity(tenantId: string, entityId: string): Promise<Task[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.relatedEntityId === entityId);
  }
}

class ActivityMockRepository extends MockRepository<Activity> implements IActivityRepository {
  async getByEntity(tenantId: string, entityId: string): Promise<Activity[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.relatedEntityId === entityId);
  }
}

class NotificationMockRepository extends MockRepository<Notification> implements INotificationRepository {
  async getByUser(tenantId: string, userId: string): Promise<Notification[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.userId === userId || !i.userId);
  }
}

class AuditLogMockRepository extends MockRepository<AuditLog> implements IAuditLogRepository {
  async getByEntity(tenantId: string, entityId: string): Promise<AuditLog[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.entityId === entityId);
  }
}

class DocumentMockRepository extends MockRepository<Document> implements IDocumentRepository {
  async getByClient(tenantId: string, clientId: string): Promise<Document[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.clientId === clientId);
  }
  async getByCase(tenantId: string, caseId: string): Promise<Document[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.caseId === caseId);
  }
}

class InvoiceMockRepository extends MockRepository<Invoice> implements IInvoiceRepository {
  async getByClient(tenantId: string, clientId: string): Promise<Invoice[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.clientId === clientId);
  }
}

class DeadlineMockRepository extends MockRepository<Deadline> implements IDeadlineRepository {
  async getByClient(tenantId: string, clientId: string): Promise<Deadline[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.relatedEntityType === 'Client' && i.relatedEntityId === clientId);
  }
  async getByCase(tenantId: string, caseId: string): Promise<Deadline[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.relatedEntityType === 'Case' && i.relatedEntityId === caseId);
  }
}

class AppointmentMockRepository extends MockRepository<Appointment> implements IAppointmentRepository {
  async getByDateRange(tenantId: string, start: Date, end: Date): Promise<Appointment[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => {
      const t = new Date(i.startTime).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }
  async getByUser(tenantId: string, userId: string): Promise<Appointment[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.assignedUserId === userId);
  }
  async getByClient(tenantId: string, clientId: string): Promise<Appointment[]> {
    const items = await this.getAll(tenantId);
    return items.filter(i => i.clientId === clientId);
  }
}

export const mockRepositories: IUnitOfWork = {
  users: new UserMockRepository('clientflow_users'),
  tenants: new MockRepository<Tenant>('clientflow_tenants'),
  clients: new ClientMockRepository('clientflow_clients'),
  leads: new MockRepository<Lead>('clientflow_leads'),
  cases: new CaseMockRepository('clientflow_cases'),
  tasks: new TaskMockRepository('clientflow_tasks'),
  activities: new ActivityMockRepository('clientflow_activities'),
  services: new MockRepository<Service>('clientflow_services'),
  clientNotes: new MockRepository<ClientNote>('clientflow_clientNotes'),
  notifications: new NotificationMockRepository('clientflow_notifications'),
  auditLogs: new AuditLogMockRepository('clientflow_auditLogs'),
  documents: new DocumentMockRepository('clientflow_documents'),
  invoices: new InvoiceMockRepository('clientflow_invoices'),
  deadlines: new DeadlineMockRepository('clientflow_deadlines'),
  appointments: new AppointmentMockRepository('clientflow_appointments'),
};
