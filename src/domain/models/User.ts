export type UserRole =
  | 'admin'
  | 'manager'
  | 'attorney'
  | 'paralegal'
  | 'receptionist'
  | 'sales'
  | 'viewer'
  | 'employee';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  currency: string;
  language: string;
  timezone: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
