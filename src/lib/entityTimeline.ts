import type { Activity, Appointment, Case, Deadline, Document, Invoice } from '../domain/models/Sales';
import type { Client, ClientNote } from '../domain/models/CRM';

export type TimelineEventType =
  | 'created'
  | 'consultation'
  | 'document'
  | 'invoice'
  | 'payment'
  | 'case'
  | 'deadline'
  | 'appointment'
  | 'task'
  | 'note'
  | 'activity'
  | 'status';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: TimelineEventType;
}

interface ClientTimelineInput {
  client: Client;
  cases?: Case[];
  documents?: Document[];
  invoices?: Invoice[];
  deadlines?: Deadline[];
  appointments?: Appointment[];
  activities?: Activity[];
  notes?: ClientNote[];
}

interface CaseTimelineInput {
  caseItem: Case;
  clientName?: string;
  documents?: Document[];
  invoices?: Invoice[];
  deadlines?: Deadline[];
  appointments?: Appointment[];
  activities?: Activity[];
}

export function buildClientTimeline(input: ClientTimelineInput): TimelineEvent[] {
  const { client } = input;
  const events: TimelineEvent[] = [
    {
      id: `client-created-${client.id}`,
      title: 'Client Created',
      description: client.name,
      date: new Date(client.createdAt),
      type: 'created',
    },
  ];

  input.appointments?.forEach((a) => {
    events.push({
      id: `appt-${a.id}`,
      title: a.type === 'Consultation' ? 'Consultation' : a.title,
      description: a.type,
      date: new Date(a.startTime),
      type: a.type === 'Consultation' ? 'consultation' : 'appointment',
    });
  });

  input.documents?.forEach((d) => {
    events.push({
      id: `doc-${d.id}`,
      title: 'Document Uploaded',
      description: `${d.name} (${d.category})`,
      date: new Date(d.createdAt),
      type: 'document',
    });
  });

  input.invoices?.forEach((inv) => {
    events.push({
      id: `inv-${inv.id}`,
      title: 'Invoice Generated',
      description: `${inv.type} — $${inv.amount}`,
      date: new Date(inv.createdAt),
      type: 'invoice',
    });
    if (inv.paidAmount > 0 && ['Paid', 'Partially Paid'].includes(inv.status)) {
      events.push({
        id: `pay-${inv.id}`,
        title: 'Payment Received',
        description: `$${inv.paidAmount} · ${inv.status}`,
        date: new Date(inv.updatedAt),
        type: 'payment',
      });
    }
  });

  input.cases?.forEach((c) => {
    events.push({
      id: `case-${c.id}`,
      title: 'Case Opened',
      description: `${c.caseType} · ${c.stage}`,
      date: new Date(c.createdAt),
      type: 'case',
    });
    if (c.stage === 'Filed' || c.filingDate) {
      events.push({
        id: `filed-${c.id}`,
        title: 'Case Submitted',
        description: c.stage,
        date: new Date(c.filingDate ?? c.updatedAt),
        type: 'status',
      });
    }
  });

  input.deadlines?.forEach((d) => {
    if (d.type.includes('Interview')) {
      events.push({
        id: `dl-${d.id}`,
        title: 'Interview Scheduled',
        description: d.title,
        date: new Date(d.date),
        type: 'deadline',
      });
    } else {
      events.push({
        id: `dl-${d.id}`,
        title: d.title,
        description: d.type,
        date: new Date(d.date),
        type: 'deadline',
      });
    }
  });

  input.notes?.forEach((n) => {
    events.push({
      id: `note-${n.id}`,
      title: 'Note Added',
      description: n.content.slice(0, 80),
      date: new Date(n.createdAt),
      type: 'note',
    });
  });

  input.activities?.forEach((a) => {
    events.push({
      id: `act-${a.id}`,
      title: a.type,
      description: a.description,
      date: new Date(a.createdAt),
      type: 'activity',
    });
  });

  if (client.immigrationStatus === 'Approved' || client.immigrationStatus === 'Closed') {
    events.push({
      id: `completed-${client.id}`,
      title: 'Completed',
      description: client.immigrationStatus,
      date: new Date(client.updatedAt),
      type: 'status',
    });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function buildCaseTimeline(input: CaseTimelineInput): TimelineEvent[] {
  const { caseItem, clientName } = input;
  const events: TimelineEvent[] = [
    {
      id: `case-created-${caseItem.id}`,
      title: 'Case Created',
      description: `${caseItem.caseType}${clientName ? ` · ${clientName}` : ''}`,
      date: new Date(caseItem.createdAt),
      type: 'created',
    },
  ];

  if (caseItem.stage !== 'Assessment') {
    events.push({
      id: `stage-${caseItem.id}`,
      title: `Stage: ${caseItem.stage}`,
      description: caseItem.currentStatus,
      date: new Date(caseItem.updatedAt),
      type: 'status',
    });
  }

  input.documents?.forEach((d) => {
    events.push({
      id: `doc-${d.id}`,
      title: 'Documents Uploaded',
      description: d.name,
      date: new Date(d.createdAt),
      type: 'document',
    });
  });

  input.invoices?.forEach((inv) => {
    events.push({
      id: `inv-${inv.id}`,
      title: 'Invoice Generated',
      description: `$${inv.amount}`,
      date: new Date(inv.createdAt),
      type: 'invoice',
    });
    if (inv.paidAmount > 0) {
      events.push({
        id: `pay-${inv.id}`,
        title: 'Payment Received',
        description: `$${inv.paidAmount}`,
        date: new Date(inv.updatedAt),
        type: 'payment',
      });
    }
  });

  input.deadlines?.forEach((d) => {
    events.push({
      id: `dl-${d.id}`,
      title: d.type.includes('Interview') ? 'Interview Scheduled' : d.title,
      description: d.type,
      date: new Date(d.date),
      type: 'deadline',
    });
  });

  input.appointments?.forEach((a) => {
    events.push({
      id: `appt-${a.id}`,
      title: a.title,
      description: a.type,
      date: new Date(a.startTime),
      type: 'appointment',
    });
  });

  input.activities?.forEach((a) => {
    events.push({
      id: `act-${a.id}`,
      title: a.type,
      description: a.description,
      date: new Date(a.createdAt),
      type: 'activity',
    });
  });

  if (['Approved', 'Closed', 'Denied'].includes(caseItem.stage)) {
    events.push({
      id: `done-${caseItem.id}`,
      title: caseItem.stage === 'Approved' ? 'Completed' : caseItem.stage,
      description: caseItem.stage,
      date: new Date(caseItem.updatedAt),
      type: 'status',
    });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}
