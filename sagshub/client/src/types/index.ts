// Re-export types from shared schema
export type { 
  Customer, 
  Case, 
  User, 
  Order, 
  InsertOrder,
  CaseWithCustomer,
  StatusHistory,
  RMA,
  InsertRMA,
  TreatmentTypeValue as TreatmentType,
  PriorityTypeValue as PriorityType,
  DeviceTypeValue as DeviceType,
  CaseStatusValue as CaseStatus,
  OrderStatusValue as OrderStatus
} from "@shared/schema";

// Additional types for the client
export interface SearchResult {
  id: number;
  type: 'customer' | 'case' | 'rma' | 'order';
  title: string;
  subtitle: string;
  link: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
} 