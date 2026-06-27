export type LeadStatus = 'New Lead' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
export type LeadSource = 'Website' | 'Facebook' | 'Instagram' | 'Referral' | 'WhatsApp' | 'LinkedIn' | 'Manual Entry';

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  source: LeadSource;
  tags: string[];
  notes: string;
  status: LeadStatus;
  assignedUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  
  // Immigration Specific Fields
  nationality?: string;
  countryOfResidence?: string;
  passportNumber?: string;
  aNumber?: string;
  uscisAccountNumber?: string;
  emergencyContact?: string;
  immigrationStatus?: string; // New Lead, Active Case, Approved, etc

  notes: string;
  lifetimeValue: number;
  tags: string[];
  lastActivityDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientNote {
  id: string;
  tenantId: string;
  clientId: string;
  content: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
