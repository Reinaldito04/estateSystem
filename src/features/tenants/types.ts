export interface Tenant {
  id: string;
  fullName: string;
  documentId: string;
  email: string | null;
  phone: string;
  workPlace: string | null;
  monthlyIncome: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { leases: number; propertyIssues: number };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TenantFormData {
  fullName: string;
  documentId: string;
  email: string;
  phone: string;
  workPlace: string;
  monthlyIncome: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}