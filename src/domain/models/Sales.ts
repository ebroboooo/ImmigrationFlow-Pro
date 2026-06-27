export type CaseStage = 'Assessment' | 'Preparation' | 'Filed' | 'Pending USCIS' | 'RFE Received' | 'Approved' | 'Denied' | 'Closed';

export type CaseType = 'I-130' | 'Adjustment of Status' | 'H1B' | 'EB2' | 'EB3' | 'F1' | 'OPT' | 'B1' | 'B2' | 'N400' | 'Green Card' | 'Asylum' | 'Removal Defense' | 'Waivers' | 'Other';

export interface Case {
  id: string;
  tenantId: string;
  name: string;
  clientId: string;
  caseType: CaseType;
  value: number;
  probability: number;
  stage: CaseStage;
  
  // Immigration Specific Fields
  uscisReceiptNumber?: string;
  filingDate?: Date;
  priorityDate?: Date;
  currentStatus?: string;
  assignedAttorney?: string;
  assignedParalegal?: string;
  filingDeadline?: Date;

  expectedCloseDate?: Date;
  assignedUserId?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskType = 'Prepare Form' | 'Review Evidence' | 'File USCIS' | 'Response to RFE' | 'Call' | 'Email' | 'Meeting' | 'Consultation' | 'Custom';

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assignedUserId?: string;
  relatedEntityId?: string; // Lead ID, Client ID, or Case ID
  relatedEntityType?: 'Lead' | 'Client' | 'Case';
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityType = 'Note' | 'Call' | 'Email' | 'Meeting' | 'Case Update' | 'Status Change' | 'Document Uploaded';

export interface Activity {
  id: string;
  tenantId: string;
  type: ActivityType;
  description: string;
  relatedEntityId: string;
  relatedEntityType: 'Lead' | 'Client' | 'Case';
  createdByUserId: string;
  createdAt: Date;
}

export type NotificationType = 'Task' | 'Case' | 'System' | 'Lead' | 'Document' | 'Deadline';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  entityType: 'Client' | 'Lead' | 'Case' | 'Task' | 'Document' | 'System';
  entityId?: string;
  details: string;
  createdAt: Date;
}

export interface Document {
  id: string;
  tenantId: string;
  clientId: string;
  caseId?: string;
  name: string;
  category: 'Passport' | 'Birth Certificate' | 'Marriage Certificate' | 'Divorce Certificate' | 'Employment Letter' | 'Tax Returns' | 'USCIS Notices' | 'Court Documents' | 'Evidence' | 'Other';
  status: 'Pending' | 'Uploaded' | 'Reviewed' | 'Rejected';
  url?: string;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deadline {
  id: string;
  tenantId: string;
  title: string;
  type: 'USCIS Deadline' | 'RFE Deadline' | 'Court Deadline' | 'Interview Date' | 'Biometric Appointment' | 'Expiration Date' | 'Filing Deadline' | 'Biometrics';
  date: Date;
  relatedEntityId?: string;
  relatedEntityType?: 'Client' | 'Case';
  status: 'Pending' | 'Met' | 'Missed';
  createdAt: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId: string;
  caseId?: string;
  amount: number;
  paidAmount: number;
  type: 'Consultation Fee' | 'Flat Fee' | 'Installment' | 'Retainer';
  status: 'Draft' | 'Sent' | 'Paid' | 'Partially Paid' | 'Overdue';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentType = 'Consultation' | 'Follow-up' | 'Interview Prep' | 'Court Hearing' | 'Biometrics' | 'USCIS Interview' | 'Internal Meeting';
export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';

export interface Appointment {
  id: string;
  tenantId: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startTime: Date;
  endTime: Date;
  clientId?: string;
  caseId?: string;
  assignedUserId?: string;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
