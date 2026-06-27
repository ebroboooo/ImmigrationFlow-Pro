import type { User, Tenant } from '../models/User';
import type { Case, Task, Activity, Document, Invoice, Deadline, Notification, AuditLog, Appointment } from '../models/Sales';
import type { Lead, Client, Service, ClientNote } from '../models/CRM';

export interface IRepository<T> {
  getAll(tenantId: string): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IUserRepository extends IRepository<User> {
  getByEmail(email: string): Promise<User | null>;
  getByRole(tenantId: string, role: string): Promise<User[]>;
}

export interface IClientRepository extends IRepository<Client> {
  getByStatus(tenantId: string, status: string): Promise<Client[]>;
}

export interface ICaseRepository extends IRepository<Case> {
  getByClient(tenantId: string, clientId: string): Promise<Case[]>;
  getByStage(tenantId: string, stage: string): Promise<Case[]>;
}

export interface ITaskRepository extends IRepository<Task> {
  getByUser(tenantId: string, userId: string): Promise<Task[]>;
  getByEntity(tenantId: string, entityId: string): Promise<Task[]>;
}

export interface IActivityRepository extends IRepository<Activity> {
  getByEntity(tenantId: string, entityId: string): Promise<Activity[]>;
}

export interface INotificationRepository extends IRepository<Notification> {
  getByUser(tenantId: string, userId: string): Promise<Notification[]>;
}

export interface IAuditLogRepository extends IRepository<AuditLog> {
  getByEntity(tenantId: string, entityId: string): Promise<AuditLog[]>;
}

export interface IDocumentRepository extends IRepository<Document> {
  getByClient(tenantId: string, clientId: string): Promise<Document[]>;
  getByCase(tenantId: string, caseId: string): Promise<Document[]>;
}

export interface IInvoiceRepository extends IRepository<Invoice> {
  getByClient(tenantId: string, clientId: string): Promise<Invoice[]>;
}

export interface IDeadlineRepository extends IRepository<Deadline> {
  getByClient(tenantId: string, clientId: string): Promise<Deadline[]>;
  getByCase(tenantId: string, caseId: string): Promise<Deadline[]>;
}

export interface IAppointmentRepository extends IRepository<Appointment> {
  getByDateRange(tenantId: string, start: Date, end: Date): Promise<Appointment[]>;
  getByUser(tenantId: string, userId: string): Promise<Appointment[]>;
  getByClient(tenantId: string, clientId: string): Promise<Appointment[]>;
}

export interface IUnitOfWork {
  users: IUserRepository;
  tenants: IRepository<Tenant>;
  clients: IClientRepository;
  leads: IRepository<Lead>;
  cases: ICaseRepository;
  tasks: ITaskRepository;
  activities: IActivityRepository;
  services: IRepository<Service>;
  clientNotes: IRepository<ClientNote>;
  notifications: INotificationRepository;
  auditLogs: IAuditLogRepository;
  documents: IDocumentRepository;
  invoices: IInvoiceRepository;
  deadlines: IDeadlineRepository;
  appointments: IAppointmentRepository;
}
