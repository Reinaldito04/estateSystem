export interface Owner {
  id: string;
  fullName: string;
  documentId: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  bankDetails: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { properties: number };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OwnerFormData {
  fullName: string;
  documentId: string;
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
  bankDetails: string;
}