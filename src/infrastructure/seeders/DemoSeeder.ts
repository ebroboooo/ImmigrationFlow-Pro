import { mockRepositories } from '../repositories/MockRepositoryFactory';
import { generateId } from '../../lib/utils';
import { ADMIN_EMAIL, DEMO_FIRM_NAME, DEMO_TENANT_ID } from '../../lib/constants';
import type { Lead, LeadSource, LeadStatus, Client } from '../../domain/models/CRM';
import type {
  Case, CaseStage, CaseType, Task, TaskStatus, TaskType, Activity,
  Document, Invoice, Deadline, Appointment, AppointmentType,
} from '../../domain/models/Sales';
import type { User, Tenant } from '../../domain/models/User';
import { subDays, addDays, addHours } from 'date-fns';

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Maria', 'Carlos', 'Priya', 'Wei', 'Ana'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Patel', 'Chen', 'Nguyen'];
const nationalities = ['Mexico', 'India', 'China', 'Philippines', 'El Salvador', 'Vietnam', 'Cuba', 'Dominican Republic', 'Guatemala', 'Korea', 'Brazil', 'Colombia', 'Nigeria', 'Pakistan'];
const clientStatuses = ['New Lead', 'Consultation Scheduled', 'Active Case', 'Waiting For Documents', 'Filed', 'Pending USCIS', 'Approved', 'Denied', 'Closed'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startDaysAgo: number, endDaysAhead: number): Date {
  const now = new Date();
  const days = Math.floor(Math.random() * (startDaysAgo + endDaysAhead)) - startDaysAgo;
  return days < 0 ? subDays(now, Math.abs(days)) : addDays(now, days);
}

function randomPrefix(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

function generateReceiptNumber() {
  const num = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${randomPrefix()}${num}`;
}

async function seedRepo(repo: { clearAndSeed: (items: unknown[]) => Promise<void> }, items: unknown[]) {
  await repo.clearAndSeed(items);
}

export async function seedDemoData() {
  const tenant: Tenant = {
    id: DEMO_TENANT_ID,
    name: DEMO_FIRM_NAME,
    currency: 'USD',
    language: 'en',
    timezone: 'America/New_York',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await seedRepo(mockRepositories.tenants as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, [tenant]);

  const users: User[] = [];
  const attorneyFirst = ['Robert', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'James', 'Lisa', 'Richard', 'Maria', 'Thomas', 'Angela'];
  const paralegalFirst = ['Jessica', 'Kevin', 'Amanda', 'Brian', 'Nicole', 'Daniel', 'Ashley', 'Ryan', 'Stephanie', 'Mark', 'Laura', 'Chris', 'Diana', 'Eric', 'Michelle', 'Jason', 'Rachel', 'Andrew'];

  for (let i = 0; i < 12; i++) {
    users.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      name: `${attorneyFirst[i]} ${randomElement(lastNames)}`,
      email: `attorney${i + 1}@smithimmigration.com`,
      role: 'attorney',
      createdAt: randomDate(365, 0),
      updatedAt: new Date(),
    });
  }
  for (let i = 0; i < 18; i++) {
    users.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      name: `${paralegalFirst[i]} ${randomElement(lastNames)}`,
      email: `paralegal${i + 1}@smithimmigration.com`,
      role: 'paralegal',
      createdAt: randomDate(365, 0),
      updatedAt: new Date(),
    });
  }
  users.push({
    id: 'admin-user',
    tenantId: DEMO_TENANT_ID,
    name: 'Managing Partner',
    email: ADMIN_EMAIL,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  users.push({
    id: generateId(),
    tenantId: DEMO_TENANT_ID,
    name: 'Front Desk',
    email: 'reception@smithimmigration.com',
    role: 'receptionist',
    createdAt: randomDate(180, 0),
    updatedAt: new Date(),
  });
  await seedRepo(mockRepositories.users as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, users);

  const attorneys = users.filter(u => u.role === 'attorney');
  const paralegals = users.filter(u => u.role === 'paralegal');

  const clients: Client[] = [];
  for (let i = 0; i < 100; i++) {
    clients.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      email: `client${i}@example.com`,
      phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      nationality: randomElement(nationalities),
      countryOfResidence: 'USA',
      passportNumber: `P${Math.floor(10000000 + Math.random() * 90000000)}`,
      aNumber: `A${Math.floor(100000000 + Math.random() * 900000000)}`,
      immigrationStatus: randomElement(clientStatuses),
      notes: 'Client intake completed.',
      lifetimeValue: Math.floor(Math.random() * 15000) + 500,
      tags: randomElement([['Family'], ['Employment'], ['Asylum'], ['Family', 'Employment']]),
      lastActivityDate: randomDate(30, 0),
      createdAt: randomDate(365, 0),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.clients as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, clients);

  const leads: Lead[] = [];
  const leadStatuses: LeadStatus[] = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
  const leadSources: LeadSource[] = ['Website', 'Facebook', 'Referral', 'WhatsApp', 'LinkedIn'];
  for (let i = 0; i < 80; i++) {
    leads.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      email: `lead${i}@example.com`,
      phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      source: randomElement(leadSources),
      status: randomElement(leadStatuses),
      tags: ['Immigration Consult'],
      notes: 'Initial consultation inquiry.',
      assignedUserId: randomElement(attorneys).id,
      createdAt: randomDate(90, 0),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.leads as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, leads);

  const cases: Case[] = [];
  const caseTypes: CaseType[] = ['I-130', 'Adjustment of Status', 'H1B', 'EB2', 'EB3', 'F1', 'OPT', 'B1', 'B2', 'N400', 'Green Card', 'Asylum', 'Removal Defense', 'Waivers', 'Other'];
  const activeStages: CaseStage[] = ['Assessment', 'Preparation', 'Filed', 'Pending USCIS', 'RFE Received', 'Approved'];

  for (let i = 0; i < 75; i++) {
    const cType = randomElement(caseTypes);
    const client = randomElement(clients);
    cases.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      name: `${cType} - ${client.name}`,
      clientId: client.id,
      caseType: cType,
      value: Math.floor(Math.random() * 8000) + 1500,
      probability: Math.floor(Math.random() * 30) + 70,
      stage: randomElement(activeStages),
      assignedAttorney: randomElement(attorneys).id,
      assignedParalegal: randomElement(paralegals).id,
      uscisReceiptNumber: Math.random() > 0.5 ? generateReceiptNumber() : undefined,
      filingDate: Math.random() > 0.4 ? randomDate(180, -30) : undefined,
      priorityDate: Math.random() > 0.6 ? randomDate(400, -100) : undefined,
      notes: 'Active immigration case.',
      createdAt: randomDate(120, 0),
      updatedAt: new Date(),
    });
  }

  for (let i = 0; i < 20; i++) {
    const cType = randomElement(caseTypes);
    const client = randomElement(clients);
    cases.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      name: `${cType} - ${client.name}`,
      clientId: client.id,
      caseType: cType,
      value: Math.floor(Math.random() * 8000) + 1500,
      probability: 100,
      stage: randomElement(['Closed', 'Denied'] as CaseStage[]),
      assignedAttorney: randomElement(attorneys).id,
      assignedParalegal: randomElement(paralegals).id,
      uscisReceiptNumber: generateReceiptNumber(),
      filingDate: randomDate(400, -200),
      currentStatus: randomElement(['Case Was Approved', 'Case Was Denied', 'Case Was Closed']),
      notes: 'Archived case.',
      createdAt: randomDate(400, -100),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.cases as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, cases);

  const tasks: Task[] = [];
  const taskTypes: TaskType[] = ['Prepare Form', 'Review Evidence', 'File USCIS', 'Response to RFE', 'Consultation', 'Call'];
  const taskStatuses: TaskStatus[] = ['Todo', 'In Progress', 'Completed'];
  for (let i = 0; i < 120; i++) {
    const relatedCase = randomElement(cases);
    tasks.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      title: `${randomElement(taskTypes)} - ${relatedCase.name}`,
      description: 'Action required for case.',
      type: randomElement(taskTypes),
      status: randomElement(taskStatuses),
      priority: randomElement(['Low', 'Medium', 'High']),
      dueDate: randomDate(0, 21),
      assignedUserId: randomElement([...attorneys, ...paralegals]).id,
      relatedEntityId: relatedCase.id,
      relatedEntityType: 'Case',
      createdAt: randomDate(30, 0),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.tasks as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, tasks);

  const documents: Document[] = [];
  const docCategories = ['Passport', 'Birth Certificate', 'Marriage Certificate', 'Tax Returns', 'Evidence', 'USCIS Notices', 'Employment Letter', 'Court Documents'] as const;
  for (let i = 0; i < 400; i++) {
    const client = randomElement(clients);
    const relatedCase = cases.find(c => c.clientId === client.id) ?? randomElement(cases);
    documents.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      clientId: client.id,
      caseId: relatedCase.id,
      name: `${randomElement([...docCategories])}_${client.name.split(' ')[1] ?? 'doc'}.pdf`,
      category: randomElement([...docCategories]),
      status: randomElement(['Pending', 'Uploaded', 'Reviewed', 'Rejected']),
      uploadedBy: randomElement([...attorneys, ...paralegals]).id,
      createdAt: randomDate(90, 0),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.documents as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, documents);

  const invoices: Invoice[] = [];
  for (let i = 0; i < 100; i++) {
    const client = randomElement(clients);
    const total = Math.floor(Math.random() * 6000) + 500;
    const paid = Math.random() > 0.35 ? total : (Math.random() > 0.5 ? Math.floor(total / 2) : 0);
    const status = paid === total ? 'Paid' : (paid > 0 ? 'Partially Paid' : (Math.random() > 0.5 ? 'Sent' : 'Draft'));
    invoices.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      clientId: client.id,
      caseId: randomElement(cases).id,
      amount: total,
      paidAmount: paid,
      type: randomElement(['Consultation Fee', 'Flat Fee', 'Installment', 'Retainer']),
      status,
      dueDate: randomDate(-15, 45),
      createdAt: randomDate(90, 0),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.invoices as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, invoices);

  const deadlines: Deadline[] = [];
  for (let i = 0; i < 70; i++) {
    const relatedCase = randomElement(cases);
    deadlines.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      title: randomElement(['USCIS Filing Deadline', 'RFE Response Due', 'Visa Expiration', 'Biometrics Appointment', 'Court Hearing']),
      type: randomElement(['USCIS Deadline', 'RFE Deadline', 'Expiration Date', 'Interview Date', 'Court Deadline']),
      date: randomDate(3, 60),
      relatedEntityId: relatedCase.id,
      relatedEntityType: 'Case',
      status: randomElement(['Pending', 'Met']),
      createdAt: randomDate(30, 0),
    });
  }
  await seedRepo(mockRepositories.deadlines as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, deadlines);

  const appointmentTypes: AppointmentType[] = ['Consultation', 'Follow-up', 'Interview Prep', 'Biometrics', 'USCIS Interview', 'Internal Meeting'];
  const appointments: Appointment[] = [];
  for (let i = 0; i < 60; i++) {
    const start = randomDate(14, 30);
    const client = randomElement(clients);
    appointments.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      title: randomElement(['Initial Consultation', 'Case Review', 'Document Signing', 'USCIS Prep', 'Client Follow-up']),
      type: randomElement(appointmentTypes),
      status: randomElement(['Scheduled', 'Confirmed', 'Completed']),
      startTime: start,
      endTime: addHours(start, randomElement([1, 1, 1.5, 2])),
      clientId: client.id,
      caseId: cases.find(c => c.clientId === client.id)?.id,
      assignedUserId: randomElement(attorneys).id,
      location: randomElement(['Conference Room A', 'Conference Room B', 'Video Call', 'Main Office']),
      notes: 'Scheduled appointment.',
      createdAt: randomDate(14, 0),
      updatedAt: new Date(),
    });
  }
  await seedRepo(mockRepositories.appointments as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, appointments);

  for (let i = 0; i < 40; i++) {
    await mockRepositories.notifications.create({
      tenantId: DEMO_TENANT_ID,
      userId: randomElement(users).id,
      title: randomElement(['New Case Assigned', 'Document Uploaded', 'Task Overdue', 'USCIS Status Updated', 'Appointment Reminder', 'Invoice Paid']),
      message: randomElement([
        'A new case has been assigned to you.',
        'Client uploaded required documents.',
        'Task deadline is approaching.',
        'USCIS case status was updated.',
        'Upcoming appointment in 24 hours.',
        'Payment received for invoice.',
      ]),
      type: randomElement(['Task', 'Case', 'Document', 'Deadline', 'System']),
      isRead: Math.random() > 0.45,
      createdAt: subDays(new Date(), Math.floor(Math.random() * 7)),
    });
  }

  const activities: Activity[] = [];
  for (let i = 0; i < 200; i++) {
    const relatedCase = randomElement(cases);
    activities.push({
      id: generateId(),
      tenantId: DEMO_TENANT_ID,
      type: randomElement(['Note', 'Call', 'Email', 'Meeting', 'Case Update', 'Status Change', 'Document Uploaded']),
      description: randomElement([
        'Client consultation completed.',
        'Documents reviewed and approved.',
        'USCIS receipt notice received.',
        'RFE response submitted.',
        'Case status updated to Pending USCIS.',
        'Invoice sent to client.',
      ]),
      relatedEntityId: relatedCase.id,
      relatedEntityType: 'Case',
      createdByUserId: randomElement([...attorneys, ...paralegals]).id,
      createdAt: randomDate(60, 0),
    });
  }
  await seedRepo(mockRepositories.activities as unknown as { clearAndSeed: (items: unknown[]) => Promise<void> }, activities);
}

type SeedableRepo = { clearAndSeed: (items: unknown[]) => Promise<void> };

export async function seedFreshData() {
  const tenant: Tenant = {
    id: DEMO_TENANT_ID,
    name: 'My Immigration Law Firm',
    currency: 'USD',
    language: 'en',
    timezone: 'America/New_York',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await seedRepo(mockRepositories.tenants as unknown as SeedableRepo, [tenant]);

  const admin: User = {
    id: 'admin-user',
    tenantId: DEMO_TENANT_ID,
    name: 'Managing Partner',
    email: ADMIN_EMAIL,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await seedRepo(mockRepositories.users as unknown as SeedableRepo, [admin]);

  const reposToClear = [
    mockRepositories.clients, mockRepositories.leads, mockRepositories.cases,
    mockRepositories.tasks, mockRepositories.activities, mockRepositories.services,
    mockRepositories.clientNotes, mockRepositories.notifications, mockRepositories.documents,
    mockRepositories.invoices, mockRepositories.deadlines, mockRepositories.appointments,
    mockRepositories.auditLogs,
  ];
  for (const repo of reposToClear) {
    await seedRepo(repo as unknown as SeedableRepo, []);
  }
}
