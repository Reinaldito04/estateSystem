export type ClientRole = "OWNER" | "TENANT" | "BUYER" | "PROSPECT" | "GUARANTOR";
export type ClientMaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "COMMON_LAW";
export type ClientRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ClientProfile {
  id: string;
  fullName: string;
  legalDocumentId: string;
  maritalStatus: ClientMaritalStatus | null;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  role: ClientRole;
  status: string;
  riskLevel: ClientRiskLevel;
  riskSummary: string | null;
  notes: string | null;
  bankDetails: string | null;
  workPlace: string | null;
  monthlyIncome: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredPropertyType: string | null;
  maxBudget: string | null;
  housingRequirement: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    communications: number;
    references: number;
    riskDocuments: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClientFormData {
  fullName: string;
  legalDocumentId: string;
  maritalStatus: string;
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
  city: string;
  role: ClientRole;
  status: string;
  riskLevel: ClientRiskLevel;
  riskSummary: string;
  notes: string;
  workPlace: string;
  monthlyIncome: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredPropertyType: string;
  maxBudget: string;
  housingRequirement: string;
}
