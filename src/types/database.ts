// ContractorOS - Core Database Types
// Prepared for multi-tenant SaaS architecture

export type UserRole = "owner" | "manager" | "employee";

export type PlanType = "free" | "pro" | "ultra";

export type ProjectStatus =
  | "lead"
  | "quoted"
  | "approved"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type POStatus =
  | "open"
  | "pending_document"
  | "document_uploaded"
  | "pending_review"
  | "completed"
  | "cancelled"
  | "exception_requested"
  | "exception_approved"
  | "exception_rejected";

export type ExpenseStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "reimbursed"
  | "cancelled";

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  default_tax_rate: number;
  quote_terms: string | null;
  po_number_format: string;
  notification_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: PlanType;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
}

export interface PlanLimit {
  id: string;
  plan_id: string;
  key: string; // e.g. "active_projects", "employees", "quotes_per_month"
  value: number; // -1 = unlimited
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  client_id: string;
  name: string;
  number: string | null;
  description: string | null;
  address: string | null;
  status: ProjectStatus;
  start_date: string | null;
  estimated_end_date: string | null;
  contract_value: number;
  budget_total: number;
  budget_materials: number;
  budget_labor: number;
  budget_subcontractors: number;
  budget_other: number;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  company_id: string;
  client_id: string;
  project_id: string | null;
  number: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  terms: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  project_id: string;
  created_by: string;
  number: string;
  vendor_name: string;
  category: string | null;
  description: string | null;
  estimated_amount: number | null;
  final_amount: number | null;
  status: POStatus;
  exception_reason: string | null;
  document_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  project_id: string | null;
  purchase_order_id: string | null;
  created_by: string;
  vendor_name: string | null;
  category_id: string;
  amount: number;
  tax_amount: number;
  date: string;
  notes: string | null;
  document_id: string | null;
  status: ExpenseStatus;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  company_id: string;
  name: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Document {
  id: string;
  company_id: string;
  uploaded_by: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  related_type: "project" | "quote" | "purchase_order" | "expense" | "client" | "company";
  related_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}
