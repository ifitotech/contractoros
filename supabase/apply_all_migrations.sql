-- BidPower — todas las migraciones en orden (generado; la fuente de verdad es supabase/migrations/).
-- Pega TODO este archivo en Supabase → SQL Editor y ejecútalo UNA sola vez en un proyecto nuevo.
-- Si ya aplicaste algunas migraciones antes, no lo uses: ejecuta solo las que falten.

-- ===== supabase/migrations/20260728000000_initial_schema.sql =====
-- BidPower Initial Schema
-- Multi-tenant SaaS foundation
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- COMPANIES & SETTINGS
-- =====================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  default_tax_rate NUMERIC(5,2) DEFAULT 0,
  quote_terms TEXT,
  po_number_format TEXT DEFAULT 'PO-{YEAR}-{NUMBER}',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

-- =====================================================
-- PROFILES & MEMBERSHIP
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- =====================================================
-- PLANS & SUBSCRIPTIONS
-- =====================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('free', 'pro', 'ultra')),
  display_name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) DEFAULT 0,
  price_yearly NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value INTEGER NOT NULL, -- -1 = unlimited
  UNIQUE(plan_id, key)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  UNIQUE(company_id, key, period_start)
);

-- =====================================================
-- CLIENTS
-- =====================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_company ON clients(company_id);

-- =====================================================
-- PROJECTS
-- =====================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  number TEXT,
  description TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN (
    'lead', 'quoted', 'approved', 'active', 'on_hold', 'completed', 'cancelled'
  )),
  start_date DATE,
  estimated_end_date DATE,
  contract_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_materials NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_labor NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_subcontractors NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_other NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(company_id, status);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =====================================================
-- QUOTES
-- =====================================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'pending', 'approved', 'rejected', 'expired', 'cancelled'
  )),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  terms TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, number)
);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE quote_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDERS
-- =====================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  estimated_amount NUMERIC(12,2),
  final_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'pending_document', 'document_uploaded', 'pending_review',
    'completed', 'cancelled', 'exception_requested', 'exception_approved', 'exception_rejected'
  )),
  exception_reason TEXT,
  document_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, number)
);

CREATE INDEX idx_po_company ON purchase_orders(company_id);
CREATE INDEX idx_po_status ON purchase_orders(company_id, status);

CREATE TABLE purchase_order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- EXPENSES & CATEGORIES
-- =====================================================

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  vendor_name TEXT,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  document_id UUID,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'rejected', 'reimbursed', 'cancelled'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);

-- =====================================================
-- DOCUMENTS
-- =====================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  related_type TEXT NOT NULL CHECK (related_type IN (
    'project', 'quote', 'purchase_order', 'expense', 'client', 'company'
  )),
  related_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_related ON documents(related_type, related_id);

-- =====================================================
-- NOTIFICATIONS & ACTIVITY
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  related_type TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_company ON activity_logs(company_id);

-- =====================================================
-- SEED DEFAULT PLANS
-- =====================================================

INSERT INTO plans (name, display_name, price_monthly, price_yearly) VALUES
  ('free', 'Free', 0, 0),
  ('pro', 'Pro', 49, 490),
  ('ultra', 'Ultra', 99, 990);

-- Free limits
INSERT INTO plan_limits (plan_id, key, value)
SELECT id, key, value FROM plans, (VALUES
  ('active_projects', 3),
  ('employees', 3),
  ('quotes_per_month', 3),
  ('expenses_per_month', 50),
  ('pos_per_month', 20)
) AS limits(key, value)
WHERE plans.name = 'free';

-- Pro limits (unlimited = -1)
INSERT INTO plan_limits (plan_id, key, value)
SELECT id, key, value FROM plans, (VALUES
  ('active_projects', -1),
  ('employees', -1),
  ('quotes_per_month', -1),
  ('expenses_per_month', -1),
  ('pos_per_month', -1)
) AS limits(key, value)
WHERE plans.name = 'pro';

-- =====================================================
-- ROW LEVEL SECURITY (basic foundation)
-- =====================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: get companies of current user
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Basic policies (expand later)
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  USING (id IN (SELECT get_user_company_ids()));

CREATE POLICY "Members can view company data"
  ON clients FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

-- More policies will be added in later phases

-- ===== supabase/migrations/20260728000001_rls_and_storage.sql =====
-- BidPower — RLS policies completas + Storage bucket
-- Ejecutar después de la migración inicial

-- =====================================================
-- HELPER: current user's company IDs
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role(p_company_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM company_members
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- PROFILES
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- =====================================================
-- COMPANIES
-- =====================================================
CREATE POLICY "Members can view their companies"
  ON companies FOR SELECT
  USING (id IN (SELECT get_user_company_ids()));

CREATE POLICY "Owners can update company"
  ON companies FOR UPDATE
  USING (get_user_role(id) = 'owner');

-- =====================================================
-- COMPANY MEMBERS
-- =====================================================
CREATE POLICY "Members can view company members"
  ON company_members FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Owners can manage members"
  ON company_members FOR ALL
  USING (get_user_role(company_id) = 'owner');

-- =====================================================
-- COMPANY SETTINGS
-- =====================================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view settings"
  ON company_settings FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Owners can update settings"
  ON company_settings FOR UPDATE
  USING (get_user_role(company_id) = 'owner');

-- =====================================================
-- CLIENTS
-- =====================================================
CREATE POLICY "Members can view clients"
  ON clients FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Managers can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND get_user_role(company_id) IN ('owner', 'manager')
  );

CREATE POLICY "Managers can update clients"
  ON clients FOR UPDATE
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND get_user_role(company_id) IN ('owner', 'manager')
  );

-- =====================================================
-- PROJECTS
-- =====================================================
-- The initial schema already defines a policy with this name; replace it so this
-- migration can run on a fresh database.
DROP POLICY IF EXISTS "Members can view projects" ON projects;
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Managers can manage projects"
  ON projects FOR ALL
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND get_user_role(company_id) IN ('owner', 'manager')
  );

-- =====================================================
-- QUOTES
-- =====================================================
CREATE POLICY "Members can view quotes"
  ON quotes FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Managers can manage quotes"
  ON quotes FOR ALL
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND get_user_role(company_id) IN ('owner', 'manager')
  );

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view quote items"
  ON quote_items FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (SELECT get_user_company_ids())
    )
  );

CREATE POLICY "Managers can manage quote items"
  ON quote_items FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (SELECT get_user_company_ids())
      AND get_user_role(company_id) IN ('owner', 'manager')
    )
  );

-- =====================================================
-- PURCHASE ORDERS
-- =====================================================
CREATE POLICY "Members can view POs"
  ON purchase_orders FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Members can create POs"
  ON purchase_orders FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Members can update own or managers all POs"
  ON purchase_orders FOR UPDATE
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      created_by = auth.uid()
      OR get_user_role(company_id) IN ('owner', 'manager')
    )
  );

-- =====================================================
-- EXPENSES
-- =====================================================
CREATE POLICY "Members can view expenses"
  ON expenses FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Managers can update expenses"
  ON expenses FOR UPDATE
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND get_user_role(company_id) IN ('owner', 'manager')
  );

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view categories"
  ON expense_categories FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Owners can manage categories"
  ON expense_categories FOR ALL
  USING (get_user_role(company_id) = 'owner');

-- =====================================================
-- DOCUMENTS
-- =====================================================
CREATE POLICY "Members can view documents"
  ON documents FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY "Members can upload documents"
  ON documents FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- ACTIVITY LOGS
-- =====================================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view activity"
  ON activity_logs FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

-- =====================================================
-- PLANS (public read)
-- =====================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT USING (true);

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plan limits"
  ON plan_limits FOR SELECT USING (true);

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view subscription"
  ON subscriptions FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

-- =====================================================
-- STORAGE BUCKET
-- =====================================================
-- Run in Supabase dashboard or via storage API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies (run after creating bucket)
-- CREATE POLICY "Company members can upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'documents'
--     AND (storage.foldername(name))[1] IN (
--       SELECT company_id::text FROM company_members
--       WHERE user_id = auth.uid() AND is_active = true
--     )
--   );
--
-- CREATE POLICY "Company members can read"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'documents'
--     AND (storage.foldername(name))[1] IN (
--       SELECT company_id::text FROM company_members
--       WHERE user_id = auth.uid() AND is_active = true
--     )
--   );

-- ===== supabase/migrations/20260728000002_signup_insert_policies.sql =====
-- Allow the authenticated user to bootstrap their first company safely.
-- This migration is additive and does not change existing policies.

CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their owner membership"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'owner');

CREATE POLICY "Owners can create company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

-- ===== supabase/migrations/20260728000003_quote_item_part_numbers.sql =====
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS part_number TEXT;

-- ===== supabase/migrations/20260728000004_quote_types.sql =====
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_type TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_quote_type_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_quote_type_check CHECK (quote_type IN ('service', 'materials', 'plan_estimate', 'complete'));

-- ===== supabase/migrations/20260728000005_phase2_5_modules.sql =====
-- BidPower Phase 2-5 supporting modules

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partial','paid','overdue','cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  part_number TEXT
);

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON calendar_events(company_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(company_id, user_id, clock_in DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage company invoices" ON invoices;
DROP POLICY IF EXISTS "Members can manage invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Members can manage client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Members can manage project members" ON project_members;
DROP POLICY IF EXISTS "Members can manage calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Members can manage project activity" ON project_activity;
DROP POLICY IF EXISTS "Members can view company time entries" ON time_entries;
DROP POLICY IF EXISTS "Employees can manage own time entries" ON time_entries;

CREATE POLICY "Members can manage company invoices" ON invoices FOR ALL TO authenticated USING (company_id IN (SELECT get_user_company_ids())) WITH CHECK (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Members can manage invoice items" ON invoice_items FOR ALL TO authenticated USING (invoice_id IN (SELECT id FROM invoices WHERE company_id IN (SELECT get_user_company_ids()))) WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE company_id IN (SELECT get_user_company_ids())));
CREATE POLICY "Members can manage client contacts" ON client_contacts FOR ALL TO authenticated USING (company_id IN (SELECT get_user_company_ids())) WITH CHECK (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Members can manage project members" ON project_members FOR ALL TO authenticated USING (project_id IN (SELECT id FROM projects WHERE company_id IN (SELECT get_user_company_ids()))) WITH CHECK (project_id IN (SELECT id FROM projects WHERE company_id IN (SELECT get_user_company_ids())));
CREATE POLICY "Members can manage calendar events" ON calendar_events FOR ALL TO authenticated USING (company_id IN (SELECT get_user_company_ids())) WITH CHECK (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Members can manage project activity" ON project_activity FOR ALL TO authenticated USING (company_id IN (SELECT get_user_company_ids())) WITH CHECK (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Members can view company time entries" ON time_entries FOR SELECT TO authenticated USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "Employees can manage own time entries" ON time_entries FOR ALL TO authenticated USING (company_id IN (SELECT get_user_company_ids()) AND user_id = auth.uid()) WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND user_id = auth.uid());

-- ===== supabase/migrations/20260729000006_supply_quotes_foundation.sql =====
-- BidPower - Supply Quotes foundation
-- Incremental migration. Does not replace or remove existing objects.

-- Ensure the existing multi-tenant helper functions are available even when
-- earlier policy migrations were not run in the same SQL editor session.
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role(p_company_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM company_members
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  department TEXT,
  branch TEXT,
  is_default_quote_contact BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  manufacturer TEXT,
  catalog_number TEXT,
  supplier_part_number TEXT,
  category TEXT,
  notes TEXT,
  preferred_brand TEXT,
  allow_substitution BOOLEAN NOT NULL DEFAULT false,
  last_unit_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES company_materials(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(material_id, alias)
);

CREATE TABLE IF NOT EXISTS material_assemblies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assembly_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assembly_id UUID NOT NULL REFERENCES material_assemblies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES company_materials(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supply_quote_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_contact_id UUID REFERENCES supplier_contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ready_to_send', 'sent', 'viewed', 'response_started', 'responded',
    'pdf_response_pending_review', 'under_review', 'accepted', 'declined',
    'converted_to_po', 'expired', 'cancelled'
  )),
  number TEXT,
  response_due_date DATE,
  delivery_method TEXT CHECK (delivery_method IN ('delivery', 'pickup')),
  delivery_address TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_quote_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES supply_quote_requests(id) ON DELETE CASCADE,
  material_id UUID REFERENCES company_materials(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  manufacturer TEXT,
  catalog_number TEXT,
  supplier_part_number TEXT,
  category TEXT,
  notes TEXT,
  preferred_brand TEXT,
  allow_substitution BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supplier_quote_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES supply_quote_requests(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_quote_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES supply_quote_requests(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES supplier_quote_invitations(id) ON DELETE SET NULL,
  supplier_name TEXT,
  supplier_contact_name TEXT,
  supplier_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'declined')),
  freight NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  expires_on DATE,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_quote_response_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES supplier_quote_responses(id) ON DELETE CASCADE,
  request_item_id UUID NOT NULL REFERENCES supply_quote_request_items(id) ON DELETE CASCADE,
  unit_price NUMERIC(12,2),
  availability TEXT CHECK (availability IN ('available', 'partial', 'unavailable')),
  lead_time TEXT,
  manufacturer TEXT,
  substitute_description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_quote_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  response_id UUID REFERENCES supplier_quote_responses(id) ON DELETE CASCADE,
  request_id UUID REFERENCES supply_quote_requests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (response_id IS NOT NULL OR request_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS quote_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES supply_quote_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id, is_active);
CREATE INDEX IF NOT EXISTS idx_company_materials_company ON company_materials(company_id, description);
CREATE INDEX IF NOT EXISTS idx_material_aliases_company ON material_aliases(company_id, alias);
CREATE INDEX IF NOT EXISTS idx_assemblies_company ON material_assemblies(company_id);
CREATE INDEX IF NOT EXISTS idx_supply_quote_requests_company ON supply_quote_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supply_quote_items_request ON supply_quote_request_items(request_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_supplier_invitations_request ON supplier_quote_invitations(request_id);
CREATE INDEX IF NOT EXISTS idx_supplier_responses_request ON supplier_quote_responses(request_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_response_items_response ON supplier_quote_response_items(response_id);
CREATE INDEX IF NOT EXISTS idx_supply_quote_activity_request ON quote_activity_log(request_id, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'suppliers', 'supplier_contacts', 'company_materials', 'material_aliases',
    'material_assemblies', 'assembly_items', 'supply_quote_requests',
    'supply_quote_request_items', 'supplier_quote_invitations',
    'supplier_quote_responses', 'supplier_quote_response_items',
    'supplier_quote_attachments', 'quote_activity_log'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Company members can read private supply data. Owner/Manager can manage it.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'suppliers', 'supplier_contacts', 'company_materials', 'material_aliases',
    'material_assemblies', 'assembly_items', 'supply_quote_requests',
    'supply_quote_request_items', 'supplier_quote_invitations',
    'supplier_quote_responses', 'supplier_quote_response_items',
    'supplier_quote_attachments', 'quote_activity_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Members can view ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (company_id IN (SELECT get_user_company_ids()))', 'Members can view ' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Managers can manage ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN (''owner'', ''manager'')) WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN (''owner'', ''manager''))', 'Managers can manage ' || table_name, table_name);
  END LOOP;
END $$;

-- ===== supabase/migrations/20260730000007_phase1_company_bootstrap.sql =====
-- BidPower — Phase 1: atomic company bootstrap
--
-- Signing up must create, in one transaction and without weakening RLS:
--   profile -> company -> owner membership -> company settings -> Free plan -> default categories
--
-- Doing this from the client with several INSERTs fails under RLS
-- (`INSERT ... RETURNING` on companies needs a SELECT policy that only passes
-- once the membership exists, and subscriptions/expense_categories have no
-- INSERT policy for a brand-new owner). This SECURITY DEFINER function keeps RLS
-- enabled everywhere and only ever acts for auth.uid().

CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  p_company_name TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_email TEXT;
  v_company UUID;
  v_plan UUID;
  v_name TEXT := btrim(coalesce(p_company_name, ''));
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'company_name_required';
  END IF;

  -- Serialise concurrent calls for the same user (double submit / parallel renders).
  PERFORM pg_advisory_xact_lock(hashtext(v_user::text));

  -- Idempotent: an existing membership is returned, never duplicated.
  SELECT company_id INTO v_company
  FROM company_members
  WHERE user_id = v_user AND is_active = true
  ORDER BY created_at
  LIMIT 1;
  IF v_company IS NOT NULL THEN
    RETURN v_company;
  END IF;

  -- A deactivated member must not silently get a new company.
  IF EXISTS (SELECT 1 FROM company_members WHERE user_id = v_user) THEN
    RAISE EXCEPTION 'membership_inactive';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  INSERT INTO profiles (id, full_name, email, phone)
  VALUES (v_user, NULLIF(btrim(coalesce(p_full_name, '')), ''), v_email, NULLIF(btrim(coalesce(p_phone, '')), ''))
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(EXCLUDED.full_name, profiles.full_name),
    email = coalesce(EXCLUDED.email, profiles.email),
    phone = coalesce(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();

  INSERT INTO companies (name, email, phone)
  VALUES (v_name, v_email, NULLIF(btrim(coalesce(p_phone, '')), ''))
  RETURNING id INTO v_company;

  INSERT INTO company_members (company_id, user_id, role, is_active, joined_at)
  VALUES (v_company, v_user, 'owner', true, NOW());

  INSERT INTO company_settings (company_id) VALUES (v_company);

  SELECT id INTO v_plan FROM plans WHERE name = 'free';
  IF v_plan IS NOT NULL THEN
    INSERT INTO subscriptions (company_id, plan_id, status)
    VALUES (v_company, v_plan, 'active');
  END IF;

  INSERT INTO expense_categories (company_id, name, is_system, is_active, sort_order)
  SELECT v_company, name, true, true, ord - 1
  FROM unnest(ARRAY[
    'Materiales', 'Herramientas', 'Combustible', 'Permisos', 'Subcontratistas',
    'Equipos', 'Alquiler', 'Comidas', 'Transporte', 'Oficina', 'Otros'
  ]) WITH ORDINALITY AS c(name, ord);

  RETURN v_company;
END;
$$;

REVOKE ALL ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT) TO authenticated;

-- ===== supabase/migrations/20260731000008_phase2_team_permissions.sql =====
-- BidPower — Phase 2: Team & Permissions
--
-- * Individual permissions per member (on top of owner / manager / employee)
-- * Permission audit trail
-- * Employees only see assigned projects (and only their own expenses / POs unless allowed)
-- * Owner-only invitations through secure tokens (no email provider required)
-- * Hardening: owner membership cannot be removed/downgraded, and self-service
--   company/owner inserts are closed now that create_company_with_owner exists.
--
-- RLS stays enabled everywhere. Nothing here disables or bypasses it.

-- =====================================================
-- MEMBER PERMISSIONS
-- =====================================================

CREATE TABLE member_permissions (
  member_id UUID PRIMARY KEY REFERENCES company_members(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  can_request_material BOOLEAN NOT NULL DEFAULT true,
  can_upload_documents BOOLEAN NOT NULL DEFAULT true,
  can_manage_library BOOLEAN NOT NULL DEFAULT false,
  can_create_pricing_request BOOLEAN NOT NULL DEFAULT false,
  can_create_po BOOLEAN NOT NULL DEFAULT false,
  can_send_po BOOLEAN NOT NULL DEFAULT false,
  -- NULL = no limit. 0 = every PO is above the limit (owner must create it).
  po_limit NUMERIC(12,2),
  can_view_costs BOOLEAN NOT NULL DEFAULT false,
  can_view_profit BOOLEAN NOT NULL DEFAULT false,
  can_create_proposal BOOLEAN NOT NULL DEFAULT false,
  template TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (po_limit IS NULL OR po_limit >= 0)
);
CREATE INDEX idx_member_permissions_company ON member_permissions(company_id);

CREATE TABLE permission_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_permission_audit_member ON permission_audit(member_id, created_at DESC);

ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit ENABLE ROW LEVEL SECURITY;

-- Permission templates (single source of truth).
CREATE OR REPLACE FUNCTION permission_template(p_template TEXT)
RETURNS JSONB
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_template
    WHEN 'owner' THEN jsonb_build_object(
      'can_request_material', true, 'can_upload_documents', true, 'can_manage_library', true,
      'can_create_pricing_request', true, 'can_create_po', true, 'can_send_po', true, 'po_limit', NULL,
      'can_view_costs', true, 'can_view_profit', true, 'can_create_proposal', true)
    WHEN 'manager' THEN jsonb_build_object(
      'can_request_material', true, 'can_upload_documents', true, 'can_manage_library', true,
      'can_create_pricing_request', true, 'can_create_po', true, 'can_send_po', true, 'po_limit', NULL,
      'can_view_costs', true, 'can_view_profit', false, 'can_create_proposal', true)
    WHEN 'employee_purchasing' THEN jsonb_build_object(
      'can_request_material', true, 'can_upload_documents', true, 'can_manage_library', false,
      'can_create_pricing_request', false, 'can_create_po', true, 'can_send_po', false, 'po_limit', 500,
      'can_view_costs', false, 'can_view_profit', false, 'can_create_proposal', false)
    ELSE jsonb_build_object(  -- employee_basic
      'can_request_material', true, 'can_upload_documents', true, 'can_manage_library', false,
      'can_create_pricing_request', false, 'can_create_po', false, 'can_send_po', false, 'po_limit', NULL,
      'can_view_costs', false, 'can_view_profit', false, 'can_create_proposal', false)
  END;
$$;

CREATE OR REPLACE FUNCTION apply_permission_template(p_member UUID, p_template TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t JSONB := permission_template(p_template);
  v_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM company_members WHERE id = p_member;
  IF v_company IS NULL THEN RETURN; END IF;
  INSERT INTO member_permissions (
    member_id, company_id, can_request_material, can_upload_documents, can_manage_library,
    can_create_pricing_request, can_create_po, can_send_po, po_limit,
    can_view_costs, can_view_profit, can_create_proposal, template, updated_by
  ) VALUES (
    p_member, v_company,
    (t->>'can_request_material')::boolean, (t->>'can_upload_documents')::boolean, (t->>'can_manage_library')::boolean,
    (t->>'can_create_pricing_request')::boolean, (t->>'can_create_po')::boolean, (t->>'can_send_po')::boolean,
    NULLIF(t->>'po_limit', '')::numeric,
    (t->>'can_view_costs')::boolean, (t->>'can_view_profit')::boolean, (t->>'can_create_proposal')::boolean,
    p_template, auth.uid()
  )
  ON CONFLICT (member_id) DO UPDATE SET
    can_request_material = EXCLUDED.can_request_material,
    can_upload_documents = EXCLUDED.can_upload_documents,
    can_manage_library = EXCLUDED.can_manage_library,
    can_create_pricing_request = EXCLUDED.can_create_pricing_request,
    can_create_po = EXCLUDED.can_create_po,
    can_send_po = EXCLUDED.can_send_po,
    po_limit = EXCLUDED.po_limit,
    can_view_costs = EXCLUDED.can_view_costs,
    can_view_profit = EXCLUDED.can_view_profit,
    can_create_proposal = EXCLUDED.can_create_proposal,
    template = EXCLUDED.template,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION apply_permission_template(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- Every new membership gets permissions from its role's template.
CREATE OR REPLACE FUNCTION trg_member_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM apply_permission_template(
    NEW.id,
    CASE NEW.role WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager' ELSE 'employee_basic' END
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER company_members_default_permissions
  AFTER INSERT ON company_members
  FOR EACH ROW EXECUTE FUNCTION trg_member_default_permissions();

-- Backfill for members that already exist.
INSERT INTO member_permissions (member_id, company_id)
SELECT id, company_id FROM company_members ON CONFLICT DO NOTHING;
UPDATE member_permissions mp SET
  can_manage_library = m.role IN ('owner', 'manager'),
  can_create_pricing_request = m.role IN ('owner', 'manager'),
  can_create_po = m.role IN ('owner', 'manager'),
  can_send_po = m.role IN ('owner', 'manager'),
  can_view_costs = m.role IN ('owner', 'manager'),
  can_view_profit = m.role = 'owner',
  can_create_proposal = m.role IN ('owner', 'manager'),
  template = CASE m.role WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager' ELSE 'employee_basic' END
FROM company_members m WHERE m.id = mp.member_id;

-- Owner keeps owner rights: cannot be downgraded or deactivated.
CREATE OR REPLACE FUNCTION trg_protect_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'owner' AND (NEW.role <> 'owner' OR NEW.is_active = false) THEN
    RAISE EXCEPTION 'owner_membership_protected';
  END IF;
  IF NEW.role = 'owner' AND OLD.role <> 'owner' THEN
    RAISE EXCEPTION 'owner_role_cannot_be_granted';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER company_members_protect_owner
  BEFORE UPDATE ON company_members
  FOR EACH ROW EXECUTE FUNCTION trg_protect_owner_membership();

-- Audit every permission change.
CREATE OR REPLACE FUNCTION trg_audit_member_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_jsonb(OLD) - 'updated_at' - 'updated_by' IS DISTINCT FROM to_jsonb(NEW) - 'updated_at' - 'updated_by' THEN
    INSERT INTO permission_audit (company_id, member_id, changed_by, old_values, new_values)
    VALUES (NEW.company_id, NEW.member_id, auth.uid(),
            to_jsonb(OLD) - 'updated_at' - 'updated_by',
            to_jsonb(NEW) - 'updated_at' - 'updated_by');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER member_permissions_audit
  AFTER UPDATE ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION trg_audit_member_permissions();

-- Permission check used by RLS and by the app.
-- Owners always pass. Managers/employees pass only if their row says so.
CREATE OR REPLACE FUNCTION has_permission(p_company UUID, p_perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE
        WHEN m.role = 'owner' THEN true
        ELSE COALESCE((to_jsonb(mp) ->> p_perm)::boolean, false)
      END
     FROM company_members m
     LEFT JOIN member_permissions mp ON mp.member_id = m.id
     WHERE m.user_id = auth.uid() AND m.company_id = p_company AND m.is_active = true
     LIMIT 1),
    false);
$$;

-- PO creation gate: permission + amount limit. An unknown amount never bypasses a limit.
CREATE OR REPLACE FUNCTION po_within_limit(p_company UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE
        WHEN m.role = 'owner' THEN true
        WHEN NOT COALESCE(mp.can_create_po, false) THEN false
        WHEN mp.po_limit IS NULL THEN true
        WHEN p_amount IS NULL THEN false
        ELSE p_amount <= mp.po_limit
      END
     FROM company_members m
     LEFT JOIN member_permissions mp ON mp.member_id = m.id
     WHERE m.user_id = auth.uid() AND m.company_id = p_company AND m.is_active = true
     LIMIT 1),
    false);
$$;

GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION po_within_limit(UUID, NUMERIC) TO authenticated;
REVOKE ALL ON FUNCTION has_permission(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION po_within_limit(UUID, NUMERIC) FROM PUBLIC, anon;

-- Policies for the new tables
CREATE POLICY "Members read own permissions, owners read all"
  ON member_permissions FOR SELECT
  USING (
    member_id IN (SELECT id FROM company_members WHERE user_id = auth.uid())
    OR get_user_role(company_id) = 'owner'
  );

CREATE POLICY "Owners update non-owner permissions"
  ON member_permissions FOR UPDATE
  USING (
    get_user_role(company_id) = 'owner'
    AND member_id IN (SELECT id FROM company_members WHERE role <> 'owner')
  )
  WITH CHECK (
    get_user_role(company_id) = 'owner'
    AND member_id IN (SELECT id FROM company_members WHERE role <> 'owner')
  );

CREATE POLICY "Owners read permission audit"
  ON permission_audit FOR SELECT
  USING (get_user_role(company_id) = 'owner');

-- =====================================================
-- PROJECT ACCESS: employees only see assigned projects
-- =====================================================

-- Helpers are SECURITY DEFINER so policies on projects and project_members can
-- consult each other without recursing through RLS. They only return booleans.
CREATE OR REPLACE FUNCTION is_project_assigned(p_project UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_project_manager(p_project UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    JOIN company_members m ON m.company_id = p.company_id
    WHERE p.id = p_project AND m.user_id = auth.uid() AND m.is_active = true
      AND m.role IN ('owner', 'manager'));
$$;

CREATE OR REPLACE FUNCTION is_active_member_of_project_company(p_project UUID, p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    JOIN company_members m ON m.company_id = p.company_id
    WHERE p.id = p_project AND m.user_id = p_user AND m.is_active = true);
$$;

REVOKE ALL ON FUNCTION is_project_assigned(UUID), is_project_manager(UUID),
  is_active_member_of_project_company(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_project_assigned(UUID), is_project_manager(UUID),
  is_active_member_of_project_company(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Members can view projects" ON projects;
CREATE POLICY "Members view accessible projects"
  ON projects FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      get_user_role(company_id) IN ('owner', 'manager')
      OR is_project_assigned(id)
    )
  );

DROP POLICY IF EXISTS "Members can manage project members" ON project_members;
CREATE POLICY "View project assignments"
  ON project_members FOR SELECT
  USING (user_id = auth.uid() OR is_project_manager(project_id));
CREATE POLICY "Managers assign project members"
  ON project_members FOR INSERT
  WITH CHECK (
    is_project_manager(project_id)
    AND is_active_member_of_project_company(project_id, user_id)
  );
CREATE POLICY "Managers unassign project members"
  ON project_members FOR DELETE
  USING (is_project_manager(project_id));

-- =====================================================
-- COST / PRICE VISIBILITY AND PURCHASING GATES
-- =====================================================

-- Expenses: managers see all; employees see their own, plus assigned projects if they may view costs.
DROP POLICY IF EXISTS "Members can view expenses" ON expenses;
CREATE POLICY "View expenses by permission"
  ON expenses FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      get_user_role(company_id) IN ('owner', 'manager')
      OR created_by = auth.uid()
      OR (has_permission(company_id, 'can_view_costs')
          AND project_id IN (SELECT id FROM projects))
    )
  );

DROP POLICY IF EXISTS "Members can create expenses" ON expenses;
CREATE POLICY "Create expenses with upload permission"
  ON expenses FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND created_by = auth.uid()
    AND has_permission(company_id, 'can_upload_documents')
    AND (project_id IS NULL OR project_id IN (SELECT id FROM projects))
  );

-- Purchase orders
DROP POLICY IF EXISTS "Members can view POs" ON purchase_orders;
CREATE POLICY "View POs by permission"
  ON purchase_orders FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      get_user_role(company_id) IN ('owner', 'manager')
      OR created_by = auth.uid()
      OR (has_permission(company_id, 'can_view_costs')
          AND project_id IN (SELECT id FROM projects))
    )
  );

DROP POLICY IF EXISTS "Members can create POs" ON purchase_orders;
CREATE POLICY "Create POs within permission and limit"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND created_by = auth.uid()
    AND po_within_limit(company_id, estimated_amount)
    AND project_id IN (SELECT id FROM projects)
  );

-- Documents
DROP POLICY IF EXISTS "Members can upload documents" ON documents;
CREATE POLICY "Upload documents with permission"
  ON documents FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND has_permission(company_id, 'can_upload_documents')
  );

-- Customer prices: quotes and invoices are for owners/managers or people allowed to make proposals.
DROP POLICY IF EXISTS "Members can view quotes" ON quotes;
CREATE POLICY "View quotes by permission"
  ON quotes FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (get_user_role(company_id) IN ('owner', 'manager') OR has_permission(company_id, 'can_create_proposal'))
  );

DROP POLICY IF EXISTS "Members can view quote items" ON quote_items;
CREATE POLICY "View quote items by permission"
  ON quote_items FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM quotes
      WHERE company_id IN (SELECT get_user_company_ids())
        AND (get_user_role(company_id) IN ('owner', 'manager') OR has_permission(company_id, 'can_create_proposal'))
    )
  );

DROP POLICY IF EXISTS "Members can manage company invoices" ON invoices;
CREATE POLICY "Managers manage invoices"
  ON invoices FOR ALL TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'));

DROP POLICY IF EXISTS "Members can manage invoice items" ON invoice_items;
CREATE POLICY "Managers manage invoice items"
  ON invoice_items FOR ALL TO authenticated
  USING (invoice_id IN (SELECT id FROM invoices WHERE company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager')))
  WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager')));

-- Supplier pricing (private supply data): owners/managers or people allowed to make Pricing Requests.
-- The material library tables (company_materials, material_aliases, ...) stay readable by all members.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'suppliers', 'supplier_contacts', 'supply_quote_requests', 'supply_quote_request_items',
    'supplier_quote_invitations', 'supplier_quote_responses', 'supplier_quote_response_items',
    'supplier_quote_attachments', 'quote_activity_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Members can view ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) AND (get_user_role(company_id) IN (''owner'', ''manager'') OR has_permission(company_id, ''can_create_pricing_request'')))',
      'View ' || t || ' by permission', t);
  END LOOP;
END $$;

-- =====================================================
-- HARDENING: close self-service bootstrap paths
-- (company creation now goes through create_company_with_owner)
-- =====================================================

DROP POLICY IF EXISTS "Users can create their owner membership" ON company_members;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;

-- =====================================================
-- INVITATIONS (secure token, owner only)
-- =====================================================

CREATE TABLE member_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  template TEXT NOT NULL DEFAULT 'employee_basic'
    CHECK (template IN ('employee_basic', 'employee_purchasing', 'manager')),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_member_invitations_company ON member_invitations(company_id, created_at DESC);
CREATE INDEX idx_member_invitations_email ON member_invitations(lower(email));

ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read invitations"
  ON member_invitations FOR SELECT
  USING (get_user_role(company_id) = 'owner');
CREATE POLICY "Owners revoke invitations"
  ON member_invitations FOR UPDATE
  USING (get_user_role(company_id) = 'owner')
  WITH CHECK (get_user_role(company_id) = 'owner');

-- Creates an invitation and returns the raw token ONCE (only its hash is stored).
CREATE OR REPLACE FUNCTION create_member_invitation(
  p_company UUID, p_email TEXT, p_full_name TEXT, p_role TEXT, p_template TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_email TEXT := lower(btrim(coalesce(p_email, '')));
  v_template TEXT;
BEGIN
  IF auth.uid() IS NULL OR get_user_role(p_company) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF p_role NOT IN ('manager', 'employee') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  v_template := coalesce(p_template, CASE p_role WHEN 'manager' THEN 'manager' ELSE 'employee_basic' END);
  IF v_template NOT IN ('employee_basic', 'employee_purchasing', 'manager') THEN
    RAISE EXCEPTION 'invalid_template';
  END IF;

  -- One live invitation per email and company.
  UPDATE member_invitations SET revoked_at = NOW()
  WHERE company_id = p_company AND lower(email) = v_email AND accepted_at IS NULL AND revoked_at IS NULL;

  INSERT INTO member_invitations (company_id, email, full_name, role, template, token_hash, invited_by)
  VALUES (p_company, v_email, NULLIF(btrim(coalesce(p_full_name, '')), ''), p_role, v_template,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), auth.uid());

  RETURN v_token;
END;
$$;
REVOKE ALL ON FUNCTION create_member_invitation(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_member_invitation(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Public preview for the invitation page (works before the invitee has an account).
CREATE OR REPLACE FUNCTION get_invitation_preview(p_token TEXT)
RETURNS TABLE (company_name TEXT, email TEXT, full_name TEXT, role TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.name, i.email, i.full_name, i.role
  FROM member_invitations i
  JOIN companies c ON c.id = i.company_id
  WHERE i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > NOW();
$$;
GRANT EXECUTE ON FUNCTION get_invitation_preview(TEXT) TO anon, authenticated;

-- Accepts an invitation for the signed-in user. The auth email must match the invitation.
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_email TEXT;
  v_inv member_invitations%ROWTYPE;
  v_member UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user;

  SELECT * INTO v_inv FROM member_invitations
  WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_invalid'; END IF;
  IF lower(v_inv.email) IS DISTINCT FROM v_email THEN RAISE EXCEPTION 'invitation_email_mismatch'; END IF;

  INSERT INTO profiles (id, full_name, email)
  VALUES (v_user, v_inv.full_name, v_email)
  ON CONFLICT (id) DO UPDATE SET full_name = coalesce(profiles.full_name, EXCLUDED.full_name);

  SELECT id INTO v_member FROM company_members WHERE company_id = v_inv.company_id AND user_id = v_user;
  IF v_member IS NULL THEN
    INSERT INTO company_members (company_id, user_id, role, is_active, invited_at, joined_at)
    VALUES (v_inv.company_id, v_user, v_inv.role, true, v_inv.created_at, NOW())
    RETURNING id INTO v_member;
  ELSE
    -- Returning member (previously deactivated): history is preserved, access is restored.
    UPDATE company_members SET is_active = true, role = v_inv.role, joined_at = coalesce(joined_at, NOW())
    WHERE id = v_member;
  END IF;

  PERFORM apply_permission_template(v_member, v_inv.template);
  UPDATE member_invitations SET accepted_at = NOW(), accepted_by = v_user WHERE id = v_inv.id;
  RETURN v_inv.company_id;
END;
$$;
REVOKE ALL ON FUNCTION accept_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;

-- Owner-only: reactivate a deactivated member (history preserved).
CREATE OR REPLACE FUNCTION set_member_active(p_member UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_role TEXT;
BEGIN
  SELECT company_id, role INTO v_company, v_role FROM company_members WHERE id = p_member;
  IF v_company IS NULL OR get_user_role(v_company) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_role = 'owner' THEN RAISE EXCEPTION 'owner_membership_protected'; END IF;
  UPDATE company_members SET is_active = p_active WHERE id = p_member;
  -- Losing access also drops project assignments so a later reactivation starts clean.
  IF NOT p_active THEN
    DELETE FROM project_members pm
    USING company_members cm, projects p
    WHERE cm.id = p_member AND pm.user_id = cm.user_id AND p.id = pm.project_id AND p.company_id = v_company;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION set_member_active(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_member_active(UUID, BOOLEAN) TO authenticated;

-- =====================================================
-- TEAM VISIBILITY: owners/managers can read teammates' profiles
-- (needed to list employees; employees still only see their own profile)
-- =====================================================
CREATE POLICY "Managers view teammate profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT cm.user_id FROM company_members cm
      WHERE cm.company_id IN (SELECT get_user_company_ids())
        AND get_user_role(cm.company_id) IN ('owner', 'manager')
    )
  );

-- ===== supabase/migrations/20260801000009_storage_documents_bucket.sql =====
-- BidPower — private Storage bucket for documents, scoped by company folder.
-- Files are stored as <company_id>/<...>. Only active members of that company can read/upload.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Company members can upload" ON storage.objects;
CREATE POLICY "Company members can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Company members can read" ON storage.objects;
CREATE POLICY "Company members can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ===== supabase/migrations/20260801000010_security_hardening.sql =====
-- BidPower — security hardening found by the Supabase advisors on a fresh project.
-- RLS stays enabled everywhere; nothing here loosens access.

-- 1) Tables that had no RLS at all.
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_status_history ENABLE ROW LEVEL SECURITY;

-- Usage counters are read by members of the company; writes only happen server-side (service role).
CREATE POLICY "Members view usage records"
  ON usage_records FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));

-- History rows follow the visibility of their parent (RLS on quotes / purchase_orders applies inside the subquery).
CREATE POLICY "View quote history of visible quotes"
  ON quote_status_history FOR SELECT
  USING (quote_id IN (SELECT id FROM quotes));
CREATE POLICY "Add quote history as yourself"
  ON quote_status_history FOR INSERT
  WITH CHECK (changed_by = auth.uid() AND quote_id IN (SELECT id FROM quotes));

CREATE POLICY "View PO history of visible POs"
  ON purchase_order_status_history FOR SELECT
  USING (purchase_order_id IN (SELECT id FROM purchase_orders));
CREATE POLICY "Add PO history as yourself"
  ON purchase_order_status_history FOR INSERT
  WITH CHECK (changed_by = auth.uid() AND purchase_order_id IN (SELECT id FROM purchase_orders));

-- 2) Trigger functions are never meant to be called through the API.
REVOKE ALL ON FUNCTION trg_audit_member_permissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trg_member_default_permissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trg_protect_owner_membership() FROM PUBLIC, anon, authenticated;

-- 3) Helpers used by RLS policies must not be callable without signing in.
--    (Policies run as the signed-in user, so `authenticated` keeps EXECUTE.)
REVOKE ALL ON FUNCTION get_user_company_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_user_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_user_company_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;

-- 4) Fixed search_path on every function that lacked one.
ALTER FUNCTION get_user_company_ids() SET search_path = public;
ALTER FUNCTION get_user_role(UUID) SET search_path = public;
ALTER FUNCTION permission_template(TEXT) SET search_path = '';
ALTER FUNCTION trg_protect_owner_membership() SET search_path = '';

-- ===== supabase/migrations/20260802000011_phase3_materials.sql =====
-- BidPower — Phase 3: Materials
--
-- Reuses the existing library tables (company_materials, material_aliases, material_assemblies = saved lists,
-- assembly_items) and adds:
--   * favorites / recents / archive on the item library
--   * Material Request (employee -> owner/manager), always inside a project
--   * library management by permission (can_manage_library), not only by role
-- RLS stays enabled everywhere. Supplier pricing tables are untouched.

-- =====================================================
-- LIBRARY: favorites, recents, archive
-- =====================================================
ALTER TABLE company_materials
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_company_materials_recent
  ON company_materials(company_id, last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_company_materials_favorite
  ON company_materials(company_id) WHERE is_favorite;

-- Library management follows the permission (owner and managers have it by template;
-- an employee only if the owner grants can_manage_library).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_materials', 'material_aliases', 'material_assemblies', 'assembly_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Manage ' || t || ' by permission', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (company_id IN (SELECT get_user_company_ids()) AND has_permission(company_id, ''can_manage_library'')) WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND has_permission(company_id, ''can_manage_library''))',
      'Manage ' || t || ' by permission', t);
  END LOOP;
END $$;

-- Anyone allowed to request material can bump the "recently used" counters of company items,
-- without being able to edit the library.
CREATE OR REPLACE FUNCTION record_material_use(p_material_ids UUID[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE company_materials
  SET use_count = use_count + 1, last_used_at = NOW()
  WHERE id = ANY(p_material_ids)
    AND company_id IN (SELECT get_user_company_ids())
    AND has_permission(company_id, 'can_request_material');
$$;
REVOKE ALL ON FUNCTION record_material_use(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_material_use(UUID[]) TO authenticated;

-- =====================================================
-- MATERIAL REQUESTS
-- =====================================================
CREATE TABLE material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'reviewed', 'rejected', 'converted', 'cancelled'
  )),
  -- Who has the next action (blueprint: "Waiting on").
  waiting_on TEXT NOT NULL DEFAULT 'owner' CHECK (waiting_on IN ('owner', 'employee', 'supplier', 'customer', 'none')),
  needed_by DATE,
  notes TEXT,
  review_note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, number)
);
CREATE INDEX idx_material_requests_project ON material_requests(project_id, created_at DESC);
CREATE INDEX idx_material_requests_company_status ON material_requests(company_id, status);

CREATE TABLE material_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  -- Optional link to the library. Free-text lines keep this NULL and never touch the library.
  material_id UUID REFERENCES company_materials(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'EA',
  category TEXT,
  manufacturer TEXT,
  catalog_number TEXT,
  allow_substitution BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_material_request_items_request ON material_request_items(request_id, sort_order);

ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_request_items ENABLE ROW LEVEL SECURITY;

-- Owners/managers see every request; everyone else only their own (and only on projects they can see).
CREATE POLICY "View material requests"
  ON material_requests FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      get_user_role(company_id) IN ('owner', 'manager')
      OR (requested_by = auth.uid() AND project_id IN (SELECT id FROM projects))
    )
  );

CREATE POLICY "Create material requests with permission"
  ON material_requests FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND requested_by = auth.uid()
    AND status = 'requested'
    AND has_permission(company_id, 'can_request_material')
    AND project_id IN (SELECT id FROM projects)
  );

CREATE POLICY "Managers review material requests"
  ON material_requests FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'));

-- The requester can only cancel their own request while it is still waiting.
CREATE POLICY "Requester cancels own pending request"
  ON material_requests FOR UPDATE
  USING (requested_by = auth.uid() AND status = 'requested')
  WITH CHECK (requested_by = auth.uid() AND status IN ('requested', 'cancelled'));

CREATE POLICY "View material request items"
  ON material_request_items FOR SELECT
  USING (request_id IN (SELECT id FROM material_requests));

CREATE POLICY "Add items to own pending request"
  ON material_request_items FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND request_id IN (
      SELECT id FROM material_requests
      WHERE company_id = material_request_items.company_id
        AND (
          get_user_role(company_id) IN ('owner', 'manager')
          OR (requested_by = auth.uid() AND status = 'requested')
        )
    )
  );

CREATE POLICY "Managers edit request items"
  ON material_request_items FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'));

CREATE POLICY "Managers delete request items"
  ON material_request_items FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN ('owner', 'manager'));

-- Next request number for the company: MR-<year>-<00001>. Server-side so two people never collide.
CREATE OR REPLACE FUNCTION next_material_request_number(p_company UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_next INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mr-' || p_company::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^MR-' || v_year || '-', ''), number)::INTEGER), 0) + 1
    INTO v_next
  FROM material_requests
  WHERE company_id = p_company AND number LIKE 'MR-' || v_year || '-%';
  RETURN 'MR-' || v_year || '-' || lpad(v_next::text, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_material_request_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_material_request_number(UUID) TO authenticated;

-- ===== supabase/migrations/20260803000012_phase4_supplier_pricing.sql =====
-- BidPower — Phase 4: Supplier Pricing (Pricing Request)
--
-- Builds on the supply_quote_* foundation. A Pricing Request is what the contractor sends to Supply
-- (type Gear / Lighting / Material / Other, Bid Date = response_due_date, files, links, specs, notes).
-- It stays separate from the Customer Quote/Proposal. Supplier pricing is private to the company.
-- This migration: request fields, numbering, Material Request -> Pricing Request hand-off, permission-based
-- creation, and price visibility that follows "view costs". RLS stays enabled everywhere.

-- =====================================================
-- REQUEST FIELDS
-- =====================================================
ALTER TABLE supply_quote_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'material'
    CHECK (request_type IN ('gear', 'lighting', 'material', 'other')),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS waiting_on TEXT NOT NULL DEFAULT 'owner'
    CHECK (waiting_on IN ('owner', 'employee', 'supplier', 'customer', 'none')),
  ADD COLUMN IF NOT EXISTS material_request_id UUID REFERENCES material_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE supply_quote_requests DROP CONSTRAINT IF EXISTS supply_quote_requests_status_check;
ALTER TABLE supply_quote_requests ADD CONSTRAINT supply_quote_requests_status_check CHECK (status IN (
  'draft', 'ready_to_send', 'sent', 'viewed', 'response_started', 'question_open', 'responded',
  'pdf_response_pending_review', 'under_review', 'accepted', 'awarded', 'declined',
  'converted_to_po', 'expired', 'cancelled', 'closed'
));

CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_quote_requests_number ON supply_quote_requests(company_id, number) WHERE number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supply_quote_requests_project ON supply_quote_requests(project_id, created_at DESC);

-- Quote data the supplier gives back: quote number, total, PDF (attachment), per-line price/availability/lead time.
ALTER TABLE supplier_quote_responses
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_number TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) CHECK (total_amount IS NULL OR total_amount >= 0),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'link', 'pdf')),
  ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_response_items_unique ON supplier_quote_response_items(response_id, request_item_id);

-- Next pricing request number: PR-<year>-<00001>. Server side so two people never collide.
CREATE OR REPLACE FUNCTION next_pricing_request_number(p_company UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_next INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('pr-' || p_company::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^PR-' || v_year || '-', ''), number)::INTEGER), 0) + 1
    INTO v_next
  FROM supply_quote_requests
  WHERE company_id = p_company AND number LIKE 'PR-' || v_year || '-%';
  RETURN 'PR-' || v_year || '-' || lpad(v_next::text, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_pricing_request_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_pricing_request_number(UUID) TO authenticated;

-- =====================================================
-- CREATION BY PERMISSION (owners/managers already manage everything)
-- =====================================================
DROP POLICY IF EXISTS "Create pricing requests with permission" ON supply_quote_requests;
CREATE POLICY "Create pricing requests with permission"
  ON supply_quote_requests FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND created_by = auth.uid()
    AND status = 'draft'
    AND has_permission(company_id, 'can_create_pricing_request')
    AND (project_id IS NULL OR project_id IN (SELECT id FROM projects))
  );

DROP POLICY IF EXISTS "Edit own draft pricing requests" ON supply_quote_requests;
CREATE POLICY "Edit own draft pricing requests"
  ON supply_quote_requests FOR UPDATE
  USING (created_by = auth.uid() AND status = 'draft' AND has_permission(company_id, 'can_create_pricing_request'))
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'cancelled') AND has_permission(company_id, 'can_create_pricing_request'));

DROP POLICY IF EXISTS "Edit lines of own draft pricing requests" ON supply_quote_request_items;
CREATE POLICY "Edit lines of own draft pricing requests"
  ON supply_quote_request_items FOR ALL
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND request_id IN (SELECT id FROM supply_quote_requests WHERE created_by = auth.uid() AND status = 'draft')
    AND has_permission(company_id, 'can_create_pricing_request')
  )
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND request_id IN (SELECT id FROM supply_quote_requests WHERE created_by = auth.uid() AND status = 'draft' AND company_id = supply_quote_request_items.company_id)
    AND has_permission(company_id, 'can_create_pricing_request')
  );

-- Someone who can create pricing requests can add a new supplier while doing it.
DROP POLICY IF EXISTS "Create suppliers with pricing permission" ON suppliers;
CREATE POLICY "Create suppliers with pricing permission"
  ON suppliers FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND created_by = auth.uid()
    AND has_permission(company_id, 'can_create_pricing_request')
  );

-- =====================================================
-- PRICE VISIBILITY: supplier prices follow "view costs"
-- =====================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_quote_responses', 'supplier_quote_response_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'View ' || t || ' by permission', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) AND (get_user_role(company_id) IN (''owner'', ''manager'') OR (has_permission(company_id, ''can_create_pricing_request'') AND has_permission(company_id, ''can_view_costs''))))',
      'View ' || t || ' by permission', t);
  END LOOP;
END $$;

-- ===== supabase/migrations/20260803000013_pricing_attachment_visibility.sql =====
-- BidPower — Phase 4 follow-up: a supplier's quote PDF shows prices, so files attached to a
-- supplier response follow "view costs". Files attached to the request itself (plans, specs) stay
-- visible to everyone who can see the Pricing Request.
DROP POLICY IF EXISTS "View supplier_quote_attachments by permission" ON supplier_quote_attachments;
CREATE POLICY "View supplier_quote_attachments by permission"
  ON supplier_quote_attachments FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      get_user_role(company_id) IN ('owner', 'manager')
      OR (
        has_permission(company_id, 'can_create_pricing_request')
        AND (response_id IS NULL OR has_permission(company_id, 'can_view_costs'))
      )
    )
  );

-- ===== supabase/migrations/20260804000014_phase4_supplier_link.sql =====
-- BidPower — Phase 4 (part 2): secure link for Supply (no account) + questions.
--
-- The contractor creates an invitation (random token, only its sha256 is stored). The supplier opens
-- /supplier/<token> and can read that one Pricing Request, ask questions and submit one response.
-- Everything goes through SECURITY DEFINER functions that check the token; the supplier never gets a
-- database session or table access. The supplier sees only what the contractor sent: no project, no
-- customer, no other supplier's answers, no prices the contractor charges.

ALTER TABLE supplier_quote_invitations
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_email TEXT;

CREATE TABLE IF NOT EXISTS pricing_request_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES supply_quote_requests(id) ON DELETE CASCADE,
  invitation_id UUID NOT NULL REFERENCES supplier_quote_invitations(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('supplier', 'contractor')),
  author_name TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pricing_questions_invitation ON pricing_request_questions(invitation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pricing_questions_request ON pricing_request_questions(request_id, created_at);
ALTER TABLE pricing_request_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View pricing questions by permission" ON pricing_request_questions;
CREATE POLICY "View pricing questions by permission"
  ON pricing_request_questions FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (get_user_role(company_id) IN ('owner', 'manager') OR has_permission(company_id, 'can_create_pricing_request'))
  );

DROP POLICY IF EXISTS "Managers answer pricing questions" ON pricing_request_questions;
CREATE POLICY "Managers answer pricing questions"
  ON pricing_request_questions FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND get_user_role(company_id) IN ('owner', 'manager')
    AND author = 'contractor'
  );

CREATE INDEX IF NOT EXISTS idx_supplier_invitations_hash ON supplier_quote_invitations(token_hash);

-- ---------------------------------------------------------------------------
-- Token check shared by the public functions. Not callable by clients.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _supplier_invitation(p_token TEXT)
RETURNS supplier_quote_invitations
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.* FROM supplier_quote_invitations i
  WHERE p_token ~ '^[a-f0-9]{64}$'
    AND i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND i.revoked_at IS NULL AND i.expires_at > NOW();
$$;
REVOKE ALL ON FUNCTION _supplier_invitation(TEXT) FROM PUBLIC, anon, authenticated;

-- What the supplier sees. NULL when the link is invalid, revoked or expired.
CREATE OR REPLACE FUNCTION supplier_get_request(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv supplier_quote_invitations%ROWTYPE;
  v_req supply_quote_requests%ROWTYPE;
  v_company TEXT;
  v_resp supplier_quote_responses%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM _supplier_invitation(p_token);
  IF v_inv.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_req FROM supply_quote_requests WHERE id = v_inv.request_id;
  SELECT name INTO v_company FROM companies WHERE id = v_req.company_id;

  UPDATE supplier_quote_invitations
     SET first_opened_at = COALESCE(first_opened_at, NOW()), last_opened_at = NOW()
   WHERE id = v_inv.id;
  IF v_inv.first_opened_at IS NULL THEN
    INSERT INTO quote_activity_log (company_id, request_id, event, metadata)
    VALUES (v_req.company_id, v_req.id, 'supplier_opened', jsonb_build_object('supplier', v_inv.supplier_name));
  END IF;

  SELECT * INTO v_resp FROM supplier_quote_responses WHERE invitation_id = v_inv.id ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'company', v_company,
    'supplier_name', v_inv.supplier_name,
    'open', v_req.status IN ('sent', 'viewed', 'response_started', 'question_open', 'responded')
            AND COALESCE(v_resp.status, 'submitted') = 'submitted',
    'request', jsonb_build_object(
      'number', v_req.number, 'type', v_req.request_type, 'title', v_req.title, 'bid_date', v_req.response_due_date,
      'notes', v_req.notes, 'links', v_req.links, 'delivery_method', v_req.delivery_method, 'delivery_address', v_req.delivery_address),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'description', i.description, 'quantity', i.quantity, 'unit', i.unit, 'manufacturer', i.manufacturer,
        'catalog_number', i.catalog_number, 'notes', i.notes, 'allow_substitution', i.allow_substitution) ORDER BY i.sort_order)
      FROM supply_quote_request_items i WHERE i.request_id = v_req.id), '[]'::jsonb),
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('author', q.author, 'body', q.body, 'created_at', q.created_at) ORDER BY q.created_at)
      FROM pricing_request_questions q WHERE q.invitation_id = v_inv.id), '[]'::jsonb),
    'response', CASE WHEN v_resp.id IS NULL THEN NULL ELSE jsonb_build_object(
      'quote_number', v_resp.quote_number, 'total_amount', v_resp.total_amount, 'freight', v_resp.freight,
      'tax_amount', v_resp.tax_amount, 'expires_on', v_resp.expires_on, 'notes', v_resp.notes, 'status', v_resp.status,
      'lines', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'request_item_id', l.request_item_id, 'unit_price', l.unit_price, 'availability', l.availability,
          'lead_time', l.lead_time, 'notes', l.notes))
        FROM supplier_quote_response_items l WHERE l.response_id = v_resp.id), '[]'::jsonb)) END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION supplier_get_request(TEXT) TO anon, authenticated;

-- The supplier answers (replaces their earlier answer while it is still only "submitted").
CREATE OR REPLACE FUNCTION supplier_submit_response(p_token TEXT, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv supplier_quote_invitations%ROWTYPE;
  v_req supply_quote_requests%ROWTYPE;
  v_resp UUID;
  v_line JSONB;
  v_item UUID;
  v_lines JSONB := COALESCE(p_payload -> 'lines', '[]'::jsonb);
  v_n INTEGER := 0;
  v_total NUMERIC;
  v_freight NUMERIC;
  v_tax NUMERIC;
  v_price NUMERIC;
  v_avail TEXT;
BEGIN
  SELECT * INTO v_inv FROM _supplier_invitation(p_token);
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  SELECT * INTO v_req FROM supply_quote_requests WHERE id = v_inv.request_id FOR UPDATE;
  IF v_req.status NOT IN ('sent', 'viewed', 'response_started', 'question_open', 'responded') THEN RAISE EXCEPTION 'request_closed'; END IF;
  IF EXISTS (SELECT 1 FROM supplier_quote_responses WHERE invitation_id = v_inv.id AND status <> 'submitted') THEN RAISE EXCEPTION 'response_locked'; END IF;
  IF jsonb_typeof(v_lines) <> 'array' OR jsonb_array_length(v_lines) > 300 THEN RAISE EXCEPTION 'invalid_payload'; END IF;

  v_total := NULLIF(p_payload ->> 'total_amount', '')::NUMERIC;
  v_freight := NULLIF(p_payload ->> 'freight', '')::NUMERIC;
  v_tax := NULLIF(p_payload ->> 'tax_amount', '')::NUMERIC;
  IF v_total < 0 OR v_total > 100000000 OR v_freight < 0 OR v_freight > 100000000 OR v_tax < 0 OR v_tax > 100000000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  IF char_length(COALESCE(p_payload ->> 'notes', '')) > 2000 OR char_length(COALESCE(p_payload ->> 'quote_number', '')) > 60 THEN RAISE EXCEPTION 'invalid_payload'; END IF;

  -- Something must be answered: a total or at least one priced/marked line.
  IF v_total IS NULL AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_lines) e
    WHERE NULLIF(e ->> 'unit_price', '') IS NOT NULL OR NULLIF(e ->> 'availability', '') IS NOT NULL
  ) THEN RAISE EXCEPTION 'response_empty'; END IF;

  DELETE FROM supplier_quote_responses WHERE invitation_id = v_inv.id AND status = 'submitted';
  INSERT INTO supplier_quote_responses (
    company_id, request_id, invitation_id, supplier_id, supplier_name, supplier_contact_name, supplier_email,
    status, freight, tax_amount, total_amount, quote_number, expires_on, notes, source, submitted_at)
  VALUES (
    v_req.company_id, v_req.id, v_inv.id, v_inv.supplier_id,
    COALESCE(NULLIF(left(p_payload ->> 'supplier_name', 120), ''), v_inv.supplier_name, 'Supplier'),
    left(p_payload ->> 'contact_name', 120), left(COALESCE(p_payload ->> 'email', v_inv.supplier_email), 200),
    'submitted', v_freight, v_tax, v_total, NULLIF(left(p_payload ->> 'quote_number', 60), ''),
    NULLIF(p_payload ->> 'expires_on', '')::DATE, NULLIF(left(p_payload ->> 'notes', 2000), ''), 'link', NOW())
  RETURNING id INTO v_resp;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
    v_n := v_n + 1;
    v_item := NULLIF(v_line ->> 'request_item_id', '')::UUID;
    IF NOT EXISTS (SELECT 1 FROM supply_quote_request_items WHERE id = v_item AND request_id = v_req.id) THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    v_price := NULLIF(v_line ->> 'unit_price', '')::NUMERIC;
    IF v_price < 0 OR v_price > 100000000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    v_avail := NULLIF(v_line ->> 'availability', '');
    IF v_avail IS NOT NULL AND v_avail NOT IN ('available', 'partial', 'unavailable') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF v_price IS NULL AND v_avail IS NULL AND NULLIF(v_line ->> 'lead_time', '') IS NULL AND NULLIF(v_line ->> 'notes', '') IS NULL THEN CONTINUE; END IF;
    INSERT INTO supplier_quote_response_items (company_id, response_id, request_item_id, unit_price, availability, lead_time, notes)
    VALUES (v_req.company_id, v_resp, v_item, v_price, v_avail, NULLIF(left(v_line ->> 'lead_time', 80), ''), NULLIF(left(v_line ->> 'notes', 500), ''))
    ON CONFLICT (response_id, request_item_id) DO UPDATE SET unit_price = EXCLUDED.unit_price, availability = EXCLUDED.availability, lead_time = EXCLUDED.lead_time, notes = EXCLUDED.notes;
  END LOOP;

  UPDATE supply_quote_requests SET status = 'responded', waiting_on = 'owner', responded_at = NOW(), updated_at = NOW() WHERE id = v_req.id;
  INSERT INTO quote_activity_log (company_id, request_id, event, metadata)
  VALUES (v_req.company_id, v_req.id, 'supplier_responded', jsonb_build_object('supplier', v_inv.supplier_name));
END;
$$;
GRANT EXECUTE ON FUNCTION supplier_submit_response(TEXT, JSONB) TO anon, authenticated;

CREATE OR REPLACE FUNCTION supplier_ask_question(p_token TEXT, p_body TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv supplier_quote_invitations%ROWTYPE;
  v_req supply_quote_requests%ROWTYPE;
  v_body TEXT := btrim(COALESCE(p_body, ''));
BEGIN
  SELECT * INTO v_inv FROM _supplier_invitation(p_token);
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  SELECT * INTO v_req FROM supply_quote_requests WHERE id = v_inv.request_id FOR UPDATE;
  IF v_req.status NOT IN ('sent', 'viewed', 'response_started', 'question_open', 'responded') THEN RAISE EXCEPTION 'request_closed'; END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 2000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  IF (SELECT count(*) FROM pricing_request_questions WHERE invitation_id = v_inv.id AND author = 'supplier') >= 30 THEN RAISE EXCEPTION 'too_many'; END IF;

  INSERT INTO pricing_request_questions (company_id, request_id, invitation_id, author, author_name, body)
  VALUES (v_req.company_id, v_req.id, v_inv.id, 'supplier', v_inv.supplier_name, v_body);
  IF v_req.status IN ('sent', 'viewed', 'response_started', 'question_open') THEN
    UPDATE supply_quote_requests SET status = 'question_open', waiting_on = 'owner', updated_at = NOW() WHERE id = v_req.id;
  END IF;
  INSERT INTO quote_activity_log (company_id, request_id, event, metadata)
  VALUES (v_req.company_id, v_req.id, 'supplier_question', jsonb_build_object('supplier', v_inv.supplier_name));
END;
$$;
GRANT EXECUTE ON FUNCTION supplier_ask_question(TEXT, TEXT) TO anon, authenticated;

-- ===== supabase/migrations/20260805000015_phase5_purchasing.sql =====
-- BidPower — Phase 5: Purchasing
--
-- Supplier response -> Purchase Order -> approval -> sent -> received -> receipt/invoice/packing slip
-- (mandatory) -> completed with actual cost. Extends the existing PO status machine (po-status.ts);
-- nothing is rewritten. Rules are enforced in the database so they cannot be skipped from the client:
--   * over the person's PO limit the PO waits for approval (Owner/Manager) instead of being blocked
--   * only Owner/Manager approve; sending needs can_send_po; approving cannot be done by the creator's own update
--   * completing needs a document and goes through complete_purchase_order(), which also records the actual
--     cost as a project expense (one expense per PO)
-- RLS stays enabled everywhere.

-- =====================================================
-- PO FIELDS AND STATUSES
-- =====================================================
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pricing_request_id UUID REFERENCES supply_quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_response_id UUID REFERENCES supplier_quote_responses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waiting_on TEXT NOT NULL DEFAULT 'none'
    CHECK (waiting_on IN ('owner', 'employee', 'supplier', 'customer', 'none')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_note TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freight NUMERIC(12,2) CHECK (freight IS NULL OR freight >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) CHECK (tax_amount IS NULL OR tax_amount >= 0);

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check CHECK (status IN (
  'open', 'pending_approval', 'approved', 'rejected', 'sent', 'received',
  'pending_document', 'document_uploaded', 'pending_review',
  'completed', 'cancelled', 'exception_requested', 'exception_approved', 'exception_rejected'
));

CREATE INDEX IF NOT EXISTS idx_po_project ON purchase_orders(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_pricing_request ON purchase_orders(pricing_request_id);

-- One PO per awarded supplier response.
CREATE UNIQUE INDEX IF NOT EXISTS idx_po_one_per_response ON purchase_orders(supplier_response_id)
  WHERE supplier_response_id IS NOT NULL AND status <> 'cancelled';

-- Lines keep the origin (request line) so cost can be traced back to what was asked for.
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  request_item_id UUID REFERENCES supply_quote_request_items(id) ON DELETE SET NULL,
  material_id UUID REFERENCES company_materials(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'EA',
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  lead_time TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id, sort_order);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Lines follow the PO's own visibility (RLS on purchase_orders applies inside the subquery).
CREATE POLICY "View PO items of visible POs"
  ON purchase_order_items FOR SELECT
  USING (purchase_order_id IN (SELECT id FROM purchase_orders));

CREATE POLICY "Add items to own or managed open PO"
  ON purchase_order_items FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND purchase_order_id IN (
      SELECT id FROM purchase_orders p
      WHERE p.company_id = purchase_order_items.company_id
        AND p.status IN ('pending_approval', 'approved', 'pending_document', 'open')
        AND (p.created_by = auth.uid() OR get_user_role(p.company_id) IN ('owner', 'manager'))
    )
  );

-- Document kind: what the paper is (receipt / invoice / packing slip).
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS document_kind TEXT CHECK (document_kind IN ('receipt', 'invoice', 'packing_slip', 'other'));

-- Receipts of a PO show costs: they follow the visibility of the PO itself.
DROP POLICY IF EXISTS "Members can view documents" ON documents;
CREATE POLICY "View documents by related record"
  ON documents FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (related_type <> 'purchase_order' OR related_id IN (SELECT id FROM purchase_orders))
  );

-- =====================================================
-- NUMBERING (server side, no collisions)
-- =====================================================
CREATE OR REPLACE FUNCTION next_purchase_order_number(p_company UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_next INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('po-' || p_company::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^PO-' || v_year || '-', ''), number)::INTEGER), 0) + 1
    INTO v_next
  FROM purchase_orders
  WHERE company_id = p_company AND number LIKE 'PO-' || v_year || '-%';
  RETURN 'PO-' || v_year || '-' || lpad(v_next::text, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_purchase_order_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_purchase_order_number(UUID) TO authenticated;

-- =====================================================
-- CREATION: over the limit means "waits for approval", not "blocked"
-- =====================================================
DROP POLICY IF EXISTS "Create POs within permission and limit" ON purchase_orders;
CREATE POLICY "Create POs within permission and limit"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_company_ids())
    AND created_by = auth.uid()
    AND project_id IN (SELECT id FROM projects)
    AND has_permission(company_id, 'can_create_po')
    AND (
      (po_within_limit(company_id, estimated_amount) AND status IN ('open', 'pending_document', 'approved'))
      OR status = 'pending_approval'
    )
  );

-- =====================================================
-- STATUS RULES IN THE DATABASE
-- =====================================================
CREATE OR REPLACE FUNCTION trg_enforce_po_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_manager BOOLEAN;
  v_allowed BOOLEAN;
BEGIN
  -- Server-side maintenance (no signed-in user) is not restricted here; clients always have a user.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  v_manager := get_user_role(NEW.company_id) IN ('owner', 'manager');

  -- Money fields cannot be edited around the approval: after approval only managers change them.
  IF NOT v_manager AND OLD.status NOT IN ('pending_approval', 'open', 'pending_document') THEN
    IF NEW.estimated_amount IS DISTINCT FROM OLD.estimated_amount OR NEW.vendor_name IS DISTINCT FROM OLD.vendor_name THEN
      RAISE EXCEPTION 'po_locked';
    END IF;
  END IF;
  IF NOT v_manager AND NEW.final_amount IS DISTINCT FROM OLD.final_amount AND COALESCE(current_setting('bidpower.po_complete', true), '') <> 'on' THEN
    RAISE EXCEPTION 'po_locked';
  END IF;
  -- An edit that pushes a waiting PO over the person's limit keeps it waiting for approval.
  IF NOT v_manager AND OLD.status = 'pending_approval' AND NEW.status = 'pending_approval' THEN RETURN NEW; END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  v_allowed := CASE OLD.status
    WHEN 'open' THEN NEW.status IN ('pending_document', 'cancelled')
    WHEN 'pending_approval' THEN NEW.status IN ('approved', 'rejected', 'cancelled')
    WHEN 'rejected' THEN NEW.status IN ('pending_approval', 'cancelled')
    WHEN 'approved' THEN NEW.status IN ('sent', 'received', 'cancelled')
    WHEN 'sent' THEN NEW.status IN ('received', 'cancelled')
    WHEN 'received' THEN NEW.status IN ('pending_document', 'document_uploaded')
    WHEN 'pending_document' THEN NEW.status IN ('document_uploaded', 'exception_requested', 'cancelled')
    WHEN 'document_uploaded' THEN NEW.status IN ('pending_review', 'completed', 'cancelled')
    WHEN 'pending_review' THEN NEW.status IN ('completed', 'pending_document', 'cancelled')
    WHEN 'exception_requested' THEN NEW.status IN ('exception_approved', 'exception_rejected', 'pending_document')
    WHEN 'exception_rejected' THEN NEW.status IN ('pending_document', 'cancelled')
    WHEN 'exception_approved' THEN NEW.status IN ('cancelled')
    ELSE false
  END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'po_transition_invalid'; END IF;

  IF NEW.status IN ('approved', 'rejected', 'exception_approved', 'exception_rejected') AND OLD.status IN ('pending_approval', 'exception_requested') AND NOT v_manager THEN
    RAISE EXCEPTION 'po_needs_manager';
  END IF;
  -- Coming back from a rejection to "waiting" is the creator's resubmission; anything else out of rejected is managers.
  IF NEW.status = 'sent' AND NOT (v_manager OR has_permission(NEW.company_id, 'can_send_po')) THEN
    RAISE EXCEPTION 'po_needs_send_permission';
  END IF;
  IF NEW.status = 'document_uploaded' AND NOT EXISTS (
    SELECT 1 FROM documents d WHERE d.related_type = 'purchase_order' AND d.related_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'po_needs_document';
  END IF;
  IF NEW.status = 'completed' AND COALESCE(current_setting('bidpower.po_complete', true), '') <> 'on' THEN
    RAISE EXCEPTION 'po_complete_via_function';
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status IN ('sent', 'approved') AND NOT v_manager THEN
    RAISE EXCEPTION 'po_needs_manager';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_enforce_po_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS enforce_po_rules ON purchase_orders;
CREATE TRIGGER enforce_po_rules BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trg_enforce_po_rules();

-- Completion: requires a receipt/invoice/packing slip, records the actual cost once as a project expense.
CREATE OR REPLACE FUNCTION complete_purchase_order(p_po UUID, p_final NUMERIC, p_tax NUMERIC DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po purchase_orders%ROWTYPE;
  v_manager BOOLEAN;
  v_category UUID;
  v_expense UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po FOR UPDATE;
  IF NOT FOUND OR v_po.company_id NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_manager := get_user_role(v_po.company_id) IN ('owner', 'manager');
  -- Managers complete any PO. The creator completes their own only within their PO limit.
  IF NOT v_manager AND NOT (v_po.created_by = auth.uid() AND po_within_limit(v_po.company_id, p_final)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_po.status NOT IN ('document_uploaded', 'pending_review') THEN RAISE EXCEPTION 'po_transition_invalid'; END IF;
  IF p_final IS NULL OR p_final < 0 OR p_final > 100000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_tax IS NOT NULL AND (p_tax < 0 OR p_tax > p_final) THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF NOT EXISTS (SELECT 1 FROM documents d WHERE d.related_type = 'purchase_order' AND d.related_id = p_po) THEN
    RAISE EXCEPTION 'po_needs_document';
  END IF;

  SELECT id INTO v_category FROM expense_categories
   WHERE company_id = v_po.company_id AND is_active
   ORDER BY (lower(name) = lower(COALESCE(v_po.category, ''))) DESC,
            (lower(name) IN ('materiales', 'materials')) DESC, sort_order, name
   LIMIT 1;
  IF v_category IS NULL THEN RAISE EXCEPTION 'no_expense_category'; END IF;

  PERFORM set_config('bidpower.po_complete', 'on', true);
  UPDATE purchase_orders
     SET status = 'completed', final_amount = p_final, tax_amount = COALESCE(p_tax, tax_amount),
         completed_at = NOW(), updated_at = NOW(), waiting_on = 'none'
   WHERE id = p_po;
  PERFORM set_config('bidpower.po_complete', 'off', true);

  INSERT INTO expenses (company_id, project_id, purchase_order_id, created_by, vendor_name, category_id, amount, tax_amount, notes, status)
  VALUES (v_po.company_id, v_po.project_id, p_po, auth.uid(), v_po.vendor_name, v_category, p_final, COALESCE(p_tax, 0), 'PO ' || v_po.number, 'approved')
  RETURNING id INTO v_expense;

  INSERT INTO purchase_order_status_history (purchase_order_id, from_status, to_status, changed_by, notes)
  VALUES (p_po, v_po.status, 'completed', auth.uid(), NULL);
  RETURN v_expense;
END;
$$;
REVOKE ALL ON FUNCTION complete_purchase_order(UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_purchase_order(UUID, NUMERIC, NUMERIC) TO authenticated;

-- One expense per PO (the actual cost), never two.
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_one_per_po ON expenses(purchase_order_id)
  WHERE purchase_order_id IS NOT NULL AND status <> 'cancelled';

-- ===== supabase/migrations/20260806000016_phase6_customer.sql =====
-- BidPower — Phase 6: Customer (Proposal, secure link, approval, Request Change, versions, Change Order)
--
-- The existing customer `quotes` table is the Proposal (kept separate from Supply Requests / Pricing Requests).
-- Added: waiting_on, versions, secure links (hash only, revocable, expiring), the customer's real actions
-- (name, date/time, IP as reported by the app server — no drawn/fabricated signatures), Change Requests
-- (customer -> contractor) and Change Orders (contractor -> customer). The customer never gets a database
-- session: SECURITY DEFINER functions check the token and return only what was shared. Customers never see
-- supplier pricing, POs, costs or profit. RLS stays enabled everywhere.

-- =====================================================
-- PROPOSAL (quotes): versions, waiting on, approval trace
-- =====================================================
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS waiting_on TEXT NOT NULL DEFAULT 'owner' CHECK (waiting_on IN ('owner', 'employee', 'supplier', 'customer', 'none')),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

UPDATE quotes SET waiting_on = CASE status WHEN 'sent' THEN 'customer' WHEN 'pending' THEN 'customer' WHEN 'draft' THEN 'owner' ELSE 'none' END
 WHERE waiting_on = 'owner' AND status <> 'draft';

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check CHECK (status IN (
  'draft', 'sent', 'pending', 'changes_requested', 'approved', 'rejected', 'expired', 'cancelled', 'superseded'
));

-- Same number for every version of a Proposal (QT-2026-0001 v1, v2...).
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_company_id_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_number_version ON quotes(company_id, number, version);
CREATE INDEX IF NOT EXISTS idx_quotes_supersedes ON quotes(supersedes_id);

-- A sent Proposal is a record of what the customer saw: prices and lines only change in a new version.
CREATE OR REPLACE FUNCTION trg_quote_lock_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF OLD.status <> 'draft' AND (
       NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
    OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.terms IS DISTINCT FROM OLD.terms OR NEW.notes IS DISTINCT FROM OLD.notes) THEN
    RAISE EXCEPTION 'quote_locked';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_quote_lock_amounts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS quote_lock_amounts ON quotes;
CREATE TRIGGER quote_lock_amounts BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION trg_quote_lock_amounts();

CREATE OR REPLACE FUNCTION trg_quote_items_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_status FROM quotes WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN RAISE EXCEPTION 'quote_locked'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION trg_quote_items_lock() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS quote_items_lock ON quote_items;
CREATE TRIGGER quote_items_lock BEFORE INSERT OR UPDATE OR DELETE ON quote_items FOR EACH ROW EXECUTE FUNCTION trg_quote_items_lock();

CREATE OR REPLACE FUNCTION next_quote_number(p_company UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_next INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('qt-' || p_company::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^QT-' || v_year || '-', ''), number)::INTEGER), 0) + 1
    INTO v_next FROM quotes WHERE company_id = p_company AND number LIKE 'QT-' || v_year || '-%';
  RETURN 'QT-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_quote_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_quote_number(UUID) TO authenticated;

-- =====================================================
-- SECURE LINKS + WHAT THE CUSTOMER DID
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  object_type TEXT NOT NULL CHECK (object_type IN ('proposal', 'change_order')),
  object_id UUID NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL DEFAULT 'approve' CHECK (scope IN ('view', 'approve')),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_links_object ON customer_links(object_type, object_id);

CREATE TABLE IF NOT EXISTS customer_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  link_id UUID REFERENCES customer_links(id) ON DELETE SET NULL,
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'approved', 'changes_requested', 'declined')),
  customer_name TEXT,
  message TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_actions_object ON customer_actions(object_type, object_id, created_at);

CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  link_id UUID REFERENCES customer_links(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'converted_to_change_order', 'declined')),
  waiting_on TEXT NOT NULL DEFAULT 'owner' CHECK (waiting_on IN ('owner', 'employee', 'supplier', 'customer', 'none')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_change_requests_company ON change_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_requests_quote ON change_requests(quote_id);

CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'declined', 'cancelled')),
  waiting_on TEXT NOT NULL DEFAULT 'owner' CHECK (waiting_on IN ('owner', 'employee', 'supplier', 'customer', 'none')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_name TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, number)
);
CREATE INDEX IF NOT EXISTS idx_change_orders_quote ON change_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_project ON change_orders(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS change_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,   -- may be negative (credit)
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_change_order_items_co ON change_order_items(change_order_id, sort_order);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_links', 'customer_actions', 'change_requests', 'change_orders', 'change_order_items'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Customer prices follow the Proposal rules: Owner/Manager, or people allowed to create Proposals.
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'View ' || t || ' by permission', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (company_id IN (SELECT get_user_company_ids()) AND (get_user_role(company_id) IN (''owner'', ''manager'') OR has_permission(company_id, ''can_create_proposal'')))', 'View ' || t || ' by permission', t);
  END LOOP;
  -- Owners/managers write links, requests and change orders. Customer actions are written only by the secure functions.
  FOREACH t IN ARRAY ARRAY['customer_links', 'change_requests', 'change_orders', 'change_order_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Managers manage ' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN (''owner'', ''manager'')) WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND get_user_role(company_id) IN (''owner'', ''manager''))', 'Managers manage ' || t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION next_change_order_number(p_company UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_next INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('co-' || p_company::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^CO-' || v_year || '-', ''), number)::INTEGER), 0) + 1
    INTO v_next FROM change_orders WHERE company_id = p_company AND number LIKE 'CO-' || v_year || '-%';
  RETURN 'CO-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_change_order_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_change_order_number(UUID) TO authenticated;

-- New Proposal version: copies the lines, the old version is superseded and its links stop working.
CREATE OR REPLACE FUNCTION new_proposal_version(p_quote UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q quotes%ROWTYPE;
  v_new UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_q FROM quotes WHERE id = p_quote FOR UPDATE;
  IF NOT FOUND OR v_q.company_id NOT IN (SELECT get_user_company_ids()) OR get_user_role(v_q.company_id) NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_q.status NOT IN ('sent', 'pending', 'changes_requested', 'rejected', 'expired') THEN RAISE EXCEPTION 'quote_not_versionable'; END IF;

  INSERT INTO quotes (company_id, client_id, project_id, number, status, quote_type, issue_date, valid_until, subtotal, tax_amount,
                      discount_amount, total, terms, notes, created_by, version, supersedes_id, waiting_on)
  VALUES (v_q.company_id, v_q.client_id, v_q.project_id, v_q.number, 'draft', v_q.quote_type, CURRENT_DATE, v_q.valid_until, v_q.subtotal, v_q.tax_amount,
          v_q.discount_amount, v_q.total, v_q.terms, v_q.notes, auth.uid(), v_q.version + 1, v_q.id, 'owner')
  RETURNING id INTO v_new;
  INSERT INTO quote_items (quote_id, description, quantity, unit_price, amount, sort_order, part_number)
  SELECT v_new, description, quantity, unit_price, amount, sort_order, part_number FROM quote_items WHERE quote_id = p_quote;

  UPDATE quotes SET status = 'superseded', waiting_on = 'none', updated_at = NOW() WHERE id = p_quote;
  UPDATE customer_links SET revoked_at = NOW() WHERE object_type = 'proposal' AND object_id = p_quote AND revoked_at IS NULL;
  INSERT INTO quote_status_history (quote_id, from_status, to_status, changed_by, notes) VALUES (p_quote, v_q.status, 'superseded', auth.uid(), 'v' || (v_q.version + 1));
  INSERT INTO quote_status_history (quote_id, from_status, to_status, changed_by, notes) VALUES (v_new, NULL, 'draft', auth.uid(), 'v' || (v_q.version + 1));
  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION new_proposal_version(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION new_proposal_version(UUID) TO authenticated;

-- =====================================================
-- PUBLIC (token) FUNCTIONS FOR THE CUSTOMER
-- =====================================================
CREATE OR REPLACE FUNCTION _customer_link(p_token TEXT)
RETURNS customer_links
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT l.* FROM customer_links l
  WHERE p_token ~ '^[a-f0-9]{64}$'
    AND l.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND l.revoked_at IS NULL AND l.expires_at > NOW();
$$;
REVOKE ALL ON FUNCTION _customer_link(TEXT) FROM PUBLIC, anon, authenticated;

-- What the customer may see: their document, their project, the company's contact data. Nothing about
-- costs, suppliers, POs, profit or other customers.
CREATE OR REPLACE FUNCTION customer_get(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l customer_links%ROWTYPE;
  q quotes%ROWTYPE;
  co change_orders%ROWTYPE;
  v_company JSONB;
  v_project JSONB;
  v_items JSONB;
  v_doc JSONB;
  v_open BOOLEAN;
  v_can_change BOOLEAN := false;
BEGIN
  SELECT * INTO l FROM _customer_link(p_token);
  IF l.id IS NULL THEN RETURN NULL; END IF;
  UPDATE customer_links SET last_used_at = NOW() WHERE id = l.id;
  SELECT jsonb_build_object('name', c.name, 'phone', c.phone, 'email', c.email) INTO v_company FROM companies c WHERE c.id = l.company_id;

  IF l.object_type = 'proposal' THEN
    SELECT * INTO q FROM quotes WHERE id = l.object_id;
    IF q.id IS NULL THEN RETURN NULL; END IF;
    SELECT jsonb_build_object('name', p.name, 'address', p.address) INTO v_project FROM projects p WHERE p.id = q.project_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('description', i.description, 'quantity', i.quantity, 'unit_price', i.unit_price, 'amount', i.amount) ORDER BY i.sort_order), '[]'::jsonb)
      INTO v_items FROM quote_items i WHERE i.quote_id = q.id;
    v_open := l.scope = 'approve' AND q.status IN ('sent', 'pending') AND (q.valid_until IS NULL OR q.valid_until >= CURRENT_DATE);
    v_can_change := l.scope = 'approve' AND q.status = 'approved';
    v_doc := jsonb_build_object('number', q.number, 'version', q.version, 'status', q.status, 'issue_date', q.issue_date, 'valid_until', q.valid_until,
      'subtotal', q.subtotal, 'tax_amount', q.tax_amount, 'discount_amount', q.discount_amount, 'total', q.total, 'terms', q.terms, 'notes', q.notes,
      'approved_at', q.approved_at, 'approved_by_name', q.approved_by_name,
      'expired', q.status IN ('sent', 'pending') AND q.valid_until IS NOT NULL AND q.valid_until < CURRENT_DATE);
  ELSE
    SELECT * INTO co FROM change_orders WHERE id = l.object_id;
    IF co.id IS NULL THEN RETURN NULL; END IF;
    SELECT jsonb_build_object('name', p.name, 'address', p.address) INTO v_project FROM projects p WHERE p.id = co.project_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('description', i.description, 'quantity', i.quantity, 'unit_price', i.unit_price, 'amount', i.amount) ORDER BY i.sort_order), '[]'::jsonb)
      INTO v_items FROM change_order_items i WHERE i.change_order_id = co.id;
    v_open := l.scope = 'approve' AND co.status = 'sent';
    v_doc := jsonb_build_object('number', co.number, 'title', co.title, 'description', co.description, 'status', co.status, 'total', co.total,
      'approved_at', co.approved_at, 'approved_by_name', co.approved_by_name);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM customer_actions WHERE link_id = l.id AND action = 'viewed') THEN
    INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action) VALUES (l.company_id, l.id, l.object_type, l.object_id, 'viewed');
  END IF;

  RETURN jsonb_build_object('kind', l.object_type, 'company', v_company, 'project', v_project, 'recipient', l.recipient_name,
    'open', v_open, 'can_request_change', v_can_change, 'doc', v_doc, 'items', v_items);
END;
$$;
GRANT EXECUTE ON FUNCTION customer_get(TEXT) TO anon, authenticated;

-- The customer acts: approve, request changes or decline. Records name, time and the IP reported by the app server.
CREATE OR REPLACE FUNCTION customer_respond(p_token TEXT, p_action TEXT, p_name TEXT, p_message TEXT, p_ip TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l customer_links%ROWTYPE;
  q quotes%ROWTYPE;
  co change_orders%ROWTYPE;
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_msg TEXT := btrim(COALESCE(p_message, ''));
  v_ip TEXT := left(NULLIF(btrim(COALESCE(p_ip, '')), ''), 64);
BEGIN
  IF p_action NOT IN ('approve', 'request_changes', 'decline') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  SELECT * INTO l FROM _customer_link(p_token);
  IF l.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  IF l.scope <> 'approve' THEN RAISE EXCEPTION 'view_only'; END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 120 THEN RAISE EXCEPTION 'name_required'; END IF;
  IF char_length(v_msg) > 2000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  IF p_action = 'request_changes' AND char_length(v_msg) < 1 THEN RAISE EXCEPTION 'message_required'; END IF;

  IF l.object_type = 'proposal' THEN
    SELECT * INTO q FROM quotes WHERE id = l.object_id FOR UPDATE;
    IF q.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;

    IF p_action = 'request_changes' AND q.status = 'approved' THEN
      -- After approval a request is a Change Request; the approved Proposal stays as approved.
      INSERT INTO change_requests (company_id, project_id, quote_id, link_id, requested_by_name, message)
      VALUES (q.company_id, q.project_id, q.id, l.id, v_name, v_msg);
      INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action, customer_name, message, ip)
      VALUES (q.company_id, l.id, 'proposal', q.id, 'changes_requested', v_name, v_msg, v_ip);
      RETURN;
    END IF;

    IF q.status NOT IN ('sent', 'pending') THEN RAISE EXCEPTION 'not_open'; END IF;
    IF q.valid_until IS NOT NULL AND q.valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'expired'; END IF;

    IF p_action = 'approve' THEN
      UPDATE quotes SET status = 'approved', waiting_on = 'none', approved_at = NOW(), approved_by_name = v_name, updated_at = NOW() WHERE id = q.id;
      INSERT INTO quote_status_history (quote_id, from_status, to_status, changed_by, notes) VALUES (q.id, q.status, 'approved', NULL, 'Customer: ' || v_name);
      -- The approved price becomes the contract value only if none was set; an early-stage project moves to approved.
      IF q.project_id IS NOT NULL THEN
        UPDATE projects SET contract_value = CASE WHEN COALESCE(contract_value, 0) = 0 THEN q.total ELSE contract_value END,
                            status = CASE WHEN status IN ('lead', 'quoted') THEN 'approved' ELSE status END,
                            updated_at = NOW()
         WHERE id = q.project_id AND company_id = q.company_id;
      END IF;
      INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action, customer_name, message, ip)
      VALUES (q.company_id, l.id, 'proposal', q.id, 'approved', v_name, NULLIF(v_msg, ''), v_ip);
    ELSIF p_action = 'request_changes' THEN
      UPDATE quotes SET status = 'changes_requested', waiting_on = 'owner', updated_at = NOW() WHERE id = q.id;
      INSERT INTO quote_status_history (quote_id, from_status, to_status, changed_by, notes) VALUES (q.id, q.status, 'changes_requested', NULL, 'Customer: ' || v_name);
      INSERT INTO change_requests (company_id, project_id, quote_id, link_id, requested_by_name, message) VALUES (q.company_id, q.project_id, q.id, l.id, v_name, v_msg);
      INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action, customer_name, message, ip)
      VALUES (q.company_id, l.id, 'proposal', q.id, 'changes_requested', v_name, v_msg, v_ip);
    ELSE
      UPDATE quotes SET status = 'rejected', waiting_on = 'none', updated_at = NOW() WHERE id = q.id;
      INSERT INTO quote_status_history (quote_id, from_status, to_status, changed_by, notes) VALUES (q.id, q.status, 'rejected', NULL, 'Customer: ' || v_name);
      INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action, customer_name, message, ip)
      VALUES (q.company_id, l.id, 'proposal', q.id, 'declined', v_name, NULLIF(v_msg, ''), v_ip);
    END IF;
  ELSE
    SELECT * INTO co FROM change_orders WHERE id = l.object_id FOR UPDATE;
    IF co.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
    IF co.status <> 'sent' THEN RAISE EXCEPTION 'not_open'; END IF;
    IF p_action = 'request_changes' THEN RAISE EXCEPTION 'unsupported'; END IF;
    IF p_action = 'approve' THEN
      UPDATE change_orders SET status = 'approved', waiting_on = 'none', approved_at = NOW(), approved_by_name = v_name, updated_at = NOW() WHERE id = co.id;
      -- The approved difference (can be a credit) adjusts the contract value once.
      UPDATE projects SET contract_value = COALESCE(contract_value, 0) + co.total, updated_at = NOW() WHERE id = co.project_id AND company_id = co.company_id;
      INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action, customer_name, message, ip)
      VALUES (co.company_id, l.id, 'change_order', co.id, 'approved', v_name, NULLIF(v_msg, ''), v_ip);
    ELSE
      UPDATE change_orders SET status = 'declined', waiting_on = 'none', updated_at = NOW() WHERE id = co.id;
      INSERT INTO customer_actions (company_id, link_id, object_type, object_id, action, customer_name, message, ip)
      VALUES (co.company_id, l.id, 'change_order', co.id, 'declined', v_name, NULLIF(v_msg, ''), v_ip);
    END IF;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION customer_respond(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ===== supabase/migrations/20260807000017_phase7_project_control.sql =====
-- BidPower — Phase 7: Project Control
--
-- One source of truth for project money and history, built from real records only:
--   * project_cost_summary: actual cost (approved/reimbursed expenses, which include completed POs),
--     committed cost (POs approved but not yet completed) and the amount still waiting for approval
--   * project_timeline: a timeline assembled from what actually happened (requests, pricing, POs, proposals,
--     customer actions, expenses, change orders). It carries no amounts.
-- Both are security_invoker views: every underlying table's RLS still applies to the person asking,
-- so nobody sees rows or projects they could not already see. Nothing is stored twice.

CREATE INDEX IF NOT EXISTS idx_expenses_project_status ON expenses(project_id, status);
CREATE INDEX IF NOT EXISTS idx_po_project_status ON purchase_orders(project_id, status);
CREATE INDEX IF NOT EXISTS idx_material_requests_project_created ON material_requests(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supply_requests_project_created ON supply_quote_requests(project_id, created_at DESC);

CREATE OR REPLACE VIEW project_cost_summary WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  p.company_id,
  COALESCE((SELECT SUM(e.amount) FROM expenses e
             WHERE e.project_id = p.id AND e.status IN ('approved', 'reimbursed')), 0)::NUMERIC(14,2) AS actual_cost,
  COALESCE((SELECT SUM(po.estimated_amount) FROM purchase_orders po
             WHERE po.project_id = p.id
               AND po.status IN ('open', 'approved', 'sent', 'received', 'pending_document', 'document_uploaded', 'pending_review')), 0)::NUMERIC(14,2) AS committed_cost,
  COALESCE((SELECT SUM(po.estimated_amount) FROM purchase_orders po
             WHERE po.project_id = p.id AND po.status = 'pending_approval'), 0)::NUMERIC(14,2) AS pending_approval_cost,
  (SELECT COUNT(*) FROM purchase_orders po
    WHERE po.project_id = p.id
      AND po.status IN ('open', 'approved', 'sent', 'received', 'pending_document', 'document_uploaded', 'pending_review'))::INTEGER AS open_po_count
FROM projects p;

CREATE OR REPLACE VIEW project_timeline WITH (security_invoker = true) AS
  SELECT mr.company_id, mr.project_id, mr.created_at AS occurred_at, 'material_request_created'::TEXT AS kind,
         'material_request'::TEXT AS ref_type, mr.id AS ref_id, mr.number AS label, mr.requested_by AS actor_id, mr.status AS detail
    FROM material_requests mr
  UNION ALL
  SELECT mr.company_id, mr.project_id, mr.reviewed_at, 'material_request_reviewed', 'material_request', mr.id, mr.number, mr.reviewed_by, mr.status
    FROM material_requests mr WHERE mr.reviewed_at IS NOT NULL
  UNION ALL
  SELECT pr.company_id, pr.project_id, pr.created_at, 'pricing_request_created', 'pricing_request', pr.id, pr.number, pr.created_by, pr.status
    FROM supply_quote_requests pr WHERE pr.project_id IS NOT NULL
  UNION ALL
  SELECT pr.company_id, pr.project_id, pr.sent_at, 'pricing_request_sent', 'pricing_request', pr.id, pr.number, pr.created_by, pr.status
    FROM supply_quote_requests pr WHERE pr.project_id IS NOT NULL AND pr.sent_at IS NOT NULL
  UNION ALL
  SELECT pr.company_id, pr.project_id, pr.responded_at, 'pricing_request_responded', 'pricing_request', pr.id, pr.number, NULL::UUID, pr.status
    FROM supply_quote_requests pr WHERE pr.project_id IS NOT NULL AND pr.responded_at IS NOT NULL
  UNION ALL
  SELECT po.company_id, po.project_id, h.created_at, 'purchase_order_status', 'purchase_order', po.id, po.number, h.changed_by, h.to_status
    FROM purchase_order_status_history h JOIN purchase_orders po ON po.id = h.purchase_order_id
  UNION ALL
  SELECT q.company_id, q.project_id, h.created_at, 'proposal_status', 'proposal', q.id, q.number, h.changed_by, h.to_status
    FROM quote_status_history h JOIN quotes q ON q.id = h.quote_id WHERE q.project_id IS NOT NULL
  UNION ALL
  SELECT q.company_id, q.project_id, a.created_at, 'customer_action', 'proposal', q.id, q.number, NULL::UUID, a.action
    FROM customer_actions a JOIN quotes q ON q.id = a.object_id
   WHERE a.object_type = 'proposal' AND q.project_id IS NOT NULL AND a.action <> 'viewed'
  UNION ALL
  SELECT co.company_id, co.project_id, a.created_at, 'customer_action', 'change_order', co.id, co.number, NULL::UUID, a.action
    FROM customer_actions a JOIN change_orders co ON co.id = a.object_id
   WHERE a.object_type = 'change_order' AND a.action <> 'viewed'
  UNION ALL
  SELECT co.company_id, co.project_id, co.created_at, 'change_order_created', 'change_order', co.id, co.number, co.created_by, co.status
    FROM change_orders co
  UNION ALL
  SELECT ex.company_id, ex.project_id, ex.created_at, 'expense_recorded', 'expense', ex.id, COALESCE(ex.vendor_name, ''), ex.created_by, ex.status
    FROM expenses ex WHERE ex.project_id IS NOT NULL;

GRANT SELECT ON project_cost_summary, project_timeline TO authenticated;
REVOKE ALL ON project_cost_summary, project_timeline FROM anon;

-- ===== supabase/migrations/20260808000018_phase8_electrical_takeoff.sql =====
-- BidPower — Phase 8: Electrical Intelligence (manual takeoff, PRELIMINARY)
--
-- No plan is "read" by software here and nothing is inferred by AI. A person uploads plans and enters what
-- they count or measure: fixture/device/gear counts by type, panel schedules with circuits and breakers,
-- feeders with lengths. BidPower only adds it up (breaker counts, wire/conduit lengths with an editable
-- waste factor) into a preliminary material list, always marked PRELIMINARY until an Owner/Manager marks it
-- verified. Any edit after verification returns it to draft. Prices never appear here.
-- RLS: Owner/Manager, or people allowed to create Pricing Requests, on projects they can see.

-- Plans are stored as documents related to the takeoff.
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_related_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_related_type_check CHECK (related_type IN (
  'project', 'quote', 'purchase_order', 'expense', 'client', 'company', 'takeoff'
));

CREATE TABLE IF NOT EXISTS takeoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  notes TEXT,
  waste_pct NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (waste_pct >= 0 AND waste_pct <= 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'verified')),
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  material_request_id UUID REFERENCES material_requests(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, number)
);
CREATE INDEX IF NOT EXISTS idx_takeoffs_project ON takeoffs(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS takeoff_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  takeoff_id UUID NOT NULL REFERENCES takeoffs(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('lighting', 'devices', 'gear', 'other')),
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  plan_ref TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_takeoff_counts_takeoff ON takeoff_counts(takeoff_id, sort_order);

CREATE TABLE IF NOT EXISTS takeoff_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  takeoff_id UUID NOT NULL REFERENCES takeoffs(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  voltage TEXT,
  phases SMALLINT NOT NULL DEFAULT 1 CHECK (phases IN (1, 3)),
  bus_amps INTEGER CHECK (bus_amps IS NULL OR bus_amps > 0),
  main_breaker_amps INTEGER CHECK (main_breaker_amps IS NULL OR main_breaker_amps > 0),
  location TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_takeoff_panels_takeoff ON takeoff_panels(takeoff_id, sort_order);

CREATE TABLE IF NOT EXISTS takeoff_circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  panel_id UUID NOT NULL REFERENCES takeoff_panels(id) ON DELETE CASCADE,
  circuit_no TEXT NOT NULL CHECK (char_length(circuit_no) BETWEEN 1 AND 20),
  description TEXT,
  breaker_amps INTEGER NOT NULL CHECK (breaker_amps > 0),
  poles SMALLINT NOT NULL DEFAULT 1 CHECK (poles IN (1, 2, 3)),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_takeoff_circuits_panel ON takeoff_circuits(panel_id, sort_order);

CREATE TABLE IF NOT EXISTS takeoff_feeders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  takeoff_id UUID NOT NULL REFERENCES takeoffs(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  from_label TEXT,
  to_label TEXT,
  length_ft NUMERIC(10,1) NOT NULL CHECK (length_ft > 0),
  conductor_size TEXT,
  conductors SMALLINT CHECK (conductors IS NULL OR conductors BETWEEN 1 AND 12),
  ground_size TEXT,
  conduit_size TEXT,
  conduit_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_takeoff_feeders_takeoff ON takeoff_feeders(takeoff_id, sort_order);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['takeoffs', 'takeoff_counts', 'takeoff_panels', 'takeoff_circuits', 'takeoff_feeders'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Owner/Manager, or Pricing Request permission, on a project the person can see.
DROP POLICY IF EXISTS "Takeoffs by permission" ON takeoffs;
CREATE POLICY "Takeoffs by permission" ON takeoffs FOR ALL
  USING (company_id IN (SELECT get_user_company_ids())
         AND (get_user_role(company_id) IN ('owner', 'manager') OR has_permission(company_id, 'can_create_pricing_request'))
         AND project_id IN (SELECT id FROM projects))
  WITH CHECK (company_id IN (SELECT get_user_company_ids())
         AND (get_user_role(company_id) IN ('owner', 'manager') OR has_permission(company_id, 'can_create_pricing_request'))
         AND project_id IN (SELECT id FROM projects));

-- Children follow the takeoff's own visibility (RLS on takeoffs applies inside the subquery).
DROP POLICY IF EXISTS "Takeoff counts follow takeoff" ON takeoff_counts;
CREATE POLICY "Takeoff counts follow takeoff" ON takeoff_counts FOR ALL
  USING (takeoff_id IN (SELECT id FROM takeoffs))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND takeoff_id IN (SELECT id FROM takeoffs WHERE company_id = takeoff_counts.company_id));
DROP POLICY IF EXISTS "Takeoff panels follow takeoff" ON takeoff_panels;
CREATE POLICY "Takeoff panels follow takeoff" ON takeoff_panels FOR ALL
  USING (takeoff_id IN (SELECT id FROM takeoffs))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND takeoff_id IN (SELECT id FROM takeoffs WHERE company_id = takeoff_panels.company_id));
DROP POLICY IF EXISTS "Takeoff circuits follow panel" ON takeoff_circuits;
CREATE POLICY "Takeoff circuits follow panel" ON takeoff_circuits FOR ALL
  USING (panel_id IN (SELECT id FROM takeoff_panels))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND panel_id IN (SELECT id FROM takeoff_panels WHERE company_id = takeoff_circuits.company_id));
DROP POLICY IF EXISTS "Takeoff feeders follow takeoff" ON takeoff_feeders;
CREATE POLICY "Takeoff feeders follow takeoff" ON takeoff_feeders FOR ALL
  USING (takeoff_id IN (SELECT id FROM takeoffs))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND takeoff_id IN (SELECT id FROM takeoffs WHERE company_id = takeoff_feeders.company_id));

-- Only Owner/Manager can call a takeoff verified; anything else stays a draft.
CREATE OR REPLACE FUNCTION trg_takeoff_verify_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'verified' AND (TG_OP = 'INSERT' OR OLD.status <> 'verified') THEN
    IF get_user_role(NEW.company_id) NOT IN ('owner', 'manager') THEN RAISE EXCEPTION 'takeoff_needs_manager'; END IF;
    NEW.verified_by := auth.uid();
    NEW.verified_at := NOW();
  END IF;
  IF NEW.status = 'draft' THEN
    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_takeoff_verify_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS takeoff_verify_rules ON takeoffs;
CREATE TRIGGER takeoff_verify_rules BEFORE INSERT OR UPDATE ON takeoffs FOR EACH ROW EXECUTE FUNCTION trg_takeoff_verify_rules();

CREATE OR REPLACE FUNCTION next_takeoff_number(p_company UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_next INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('tk-' || p_company::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^TK-' || v_year || '-', ''), number)::INTEGER), 0) + 1
    INTO v_next FROM takeoffs WHERE company_id = p_company AND number LIKE 'TK-' || v_year || '-%';
  RETURN 'TK-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION next_takeoff_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_takeoff_number(UUID) TO authenticated;

-- Any change to the numbers of a verified takeoff sends it back to draft: "verified" always describes
-- exactly what is on screen.
CREATE OR REPLACE FUNCTION trg_takeoff_child_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_takeoff UUID;
BEGIN
  IF TG_TABLE_NAME = 'takeoff_circuits' THEN
    SELECT takeoff_id INTO v_takeoff FROM takeoff_panels WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSE
    v_takeoff := COALESCE(NEW.takeoff_id, OLD.takeoff_id);
  END IF;
  IF v_takeoff IS NOT NULL THEN
    UPDATE takeoffs SET status = 'draft', updated_at = NOW() WHERE id = v_takeoff AND status = 'verified';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION trg_takeoff_child_touch() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['takeoff_counts', 'takeoff_panels', 'takeoff_circuits', 'takeoff_feeders'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS takeoff_child_touch ON %I', t);
    EXECUTE format('CREATE TRIGGER takeoff_child_touch AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION trg_takeoff_child_touch()', t);
  END LOOP;
END $$;

-- ===== supabase/migrations/20260809000019_expense_review_rules.sql =====
-- BidPower — Expense integrity (feeds project actual cost)
--
-- Project actual cost only counts approved/reimbursed expenses. An Employee's expense therefore starts as
-- "pending_review" and an Owner/Manager approves or rejects it; Owner/Manager expenses are approved on entry.
-- The rules live in the database so they cannot be skipped from the client. The cost of a completed PO
-- (complete_purchase_order) is already approved because it went through the PO approval/limit rules.

DROP POLICY IF EXISTS "Creators edit own pending expenses" ON expenses;
CREATE POLICY "Creators edit own pending expenses"
  ON expenses FOR UPDATE
  USING (created_by = auth.uid() AND status = 'pending_review')
  WITH CHECK (created_by = auth.uid() AND status IN ('pending_review', 'cancelled'));

CREATE OR REPLACE FUNCTION trg_expense_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_manager BOOLEAN;
  v_po_flow BOOLEAN := COALESCE(current_setting('bidpower.po_complete', true), '') = 'on';
BEGIN
  IF auth.uid() IS NULL OR v_po_flow THEN RETURN NEW; END IF;
  v_manager := get_user_role(NEW.company_id) IN ('owner', 'manager');
  IF TG_OP = 'INSERT' THEN
    IF NOT v_manager THEN NEW.status := 'pending_review'; END IF;
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN RAISE EXCEPTION 'expense_invalid_amount'; END IF;
    RETURN NEW;
  END IF;
  IF NOT v_manager THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status = 'pending_review' AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'expense_needs_manager';
    END IF;
    IF OLD.status <> 'pending_review' AND (NEW.amount IS DISTINCT FROM OLD.amount OR NEW.project_id IS DISTINCT FROM OLD.project_id) THEN
      RAISE EXCEPTION 'expense_locked';
    END IF;
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN RAISE EXCEPTION 'expense_invalid_amount'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_expense_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS expense_rules ON expenses;
CREATE TRIGGER expense_rules BEFORE INSERT OR UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION trg_expense_rules();

-- The PO cost expense is inserted while the completion flag is still on (so it stays approved), then the flag is cleared.
CREATE OR REPLACE FUNCTION complete_purchase_order(p_po UUID, p_final NUMERIC, p_tax NUMERIC DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po purchase_orders%ROWTYPE;
  v_manager BOOLEAN;
  v_category UUID;
  v_expense UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po FOR UPDATE;
  IF NOT FOUND OR v_po.company_id NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_manager := get_user_role(v_po.company_id) IN ('owner', 'manager');
  IF NOT v_manager AND NOT (v_po.created_by = auth.uid() AND po_within_limit(v_po.company_id, p_final)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_po.status NOT IN ('document_uploaded', 'pending_review') THEN RAISE EXCEPTION 'po_transition_invalid'; END IF;
  IF p_final IS NULL OR p_final < 0 OR p_final > 100000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_tax IS NOT NULL AND (p_tax < 0 OR p_tax > p_final) THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF NOT EXISTS (SELECT 1 FROM documents d WHERE d.related_type = 'purchase_order' AND d.related_id = p_po) THEN
    RAISE EXCEPTION 'po_needs_document';
  END IF;

  SELECT id INTO v_category FROM expense_categories
   WHERE company_id = v_po.company_id AND is_active
   ORDER BY (lower(name) = lower(COALESCE(v_po.category, ''))) DESC,
            (lower(name) IN ('materiales', 'materials')) DESC, sort_order, name
   LIMIT 1;
  IF v_category IS NULL THEN RAISE EXCEPTION 'no_expense_category'; END IF;

  PERFORM set_config('bidpower.po_complete', 'on', true);
  UPDATE purchase_orders
     SET status = 'completed', final_amount = p_final, tax_amount = COALESCE(p_tax, tax_amount),
         completed_at = NOW(), updated_at = NOW(), waiting_on = 'none'
   WHERE id = p_po;

  INSERT INTO expenses (company_id, project_id, purchase_order_id, created_by, vendor_name, category_id, amount, tax_amount, notes, status)
  VALUES (v_po.company_id, v_po.project_id, p_po, auth.uid(), v_po.vendor_name, v_category, p_final, COALESCE(p_tax, 0), 'PO ' || v_po.number, 'approved')
  RETURNING id INTO v_expense;
  PERFORM set_config('bidpower.po_complete', 'off', true);

  INSERT INTO purchase_order_status_history (purchase_order_id, from_status, to_status, changed_by, notes)
  VALUES (p_po, v_po.status, 'completed', auth.uid(), NULL);
  RETURN v_expense;
END;
$$;
REVOKE ALL ON FUNCTION complete_purchase_order(UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_purchase_order(UUID, NUMERIC, NUMERIC) TO authenticated;

-- ===== supabase/migrations/20260810000020_phase9_supply_premium.sql =====
-- BidPower — Phase 9: Supply Premium
--
-- A Supply house gets an account of its own (companies.kind = 'supply') next to the secure link that already
-- works without an account. A supply account is connected to a contractor by a single-use code the supply
-- shares; the contractor redeems it and the supplier record becomes "connected". From then on a Pricing Request
-- can be sent inside the app: it lands in the supply's inbox with its Bid Date, plans/specs are readable, the
-- supply answers or asks questions, and sees which quotes it sent and their outcome. It reuses the exact same
-- response/question logic as the secure link (one implementation), so the contractor's screens do not change.
--
-- Isolation: contractor and supply are different companies. The supply never gets table access to contractor
-- data: it only calls SECURITY DEFINER functions that check membership + an active connection + the invitation,
-- and return the same fields the secure link shows (never project, customer, other suppliers or prices charged).
-- No AI plan analysis: the supply can open the files the contractor attached, nothing more.

-- =====================================================
-- ACCOUNT TYPE
-- =====================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'contractor' CHECK (kind IN ('contractor', 'supply'));
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supply_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_supply_company ON suppliers(supply_company_id) WHERE supply_company_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_company_with_owner(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  p_company_name TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_kind TEXT DEFAULT 'contractor'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_email TEXT;
  v_company UUID;
  v_plan UUID;
  v_name TEXT := btrim(coalesce(p_company_name, ''));
  v_kind TEXT := CASE WHEN p_kind = 'supply' THEN 'supply' ELSE 'contractor' END;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_name = '' THEN RAISE EXCEPTION 'company_name_required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_user::text));

  SELECT company_id INTO v_company FROM company_members WHERE user_id = v_user AND is_active = true ORDER BY created_at LIMIT 1;
  IF v_company IS NOT NULL THEN RETURN v_company; END IF;
  IF EXISTS (SELECT 1 FROM company_members WHERE user_id = v_user) THEN RAISE EXCEPTION 'membership_inactive'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  INSERT INTO profiles (id, full_name, email, phone)
  VALUES (v_user, NULLIF(btrim(coalesce(p_full_name, '')), ''), v_email, NULLIF(btrim(coalesce(p_phone, '')), ''))
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(EXCLUDED.full_name, profiles.full_name),
    email = coalesce(EXCLUDED.email, profiles.email),
    phone = coalesce(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();

  INSERT INTO companies (name, email, phone, kind) VALUES (v_name, v_email, NULLIF(btrim(coalesce(p_phone, '')), ''), v_kind) RETURNING id INTO v_company;
  INSERT INTO company_members (company_id, user_id, role, is_active, joined_at) VALUES (v_company, v_user, 'owner', true, NOW());
  INSERT INTO company_settings (company_id) VALUES (v_company);
  SELECT id INTO v_plan FROM plans WHERE name = 'free';
  IF v_plan IS NOT NULL THEN INSERT INTO subscriptions (company_id, plan_id, status) VALUES (v_company, v_plan, 'active'); END IF;
  INSERT INTO expense_categories (company_id, name, is_system, is_active, sort_order)
  SELECT v_company, name, true, true, ord - 1
  FROM unnest(ARRAY['Materiales', 'Herramientas', 'Combustible', 'Permisos', 'Subcontratistas', 'Equipos', 'Alquiler', 'Comidas', 'Transporte', 'Oficina', 'Otros']) WITH ORDINALITY AS c(name, ord);
  RETURN v_company;
END;
$$;
REVOKE ALL ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- CONNECTION CODES AND CONNECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS supply_connect_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS supply_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contractor_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (supply_company_id, contractor_company_id)
);
CREATE INDEX IF NOT EXISTS idx_supply_connections_contractor ON supply_connections(contractor_company_id, status);
ALTER TABLE supply_connect_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supply managers see their codes" ON supply_connect_codes;
CREATE POLICY "Supply managers see their codes" ON supply_connect_codes FOR SELECT
  USING (supply_company_id IN (SELECT get_user_company_ids()) AND get_user_role(supply_company_id) IN ('owner', 'manager'));

DROP POLICY IF EXISTS "Either side sees the connection" ON supply_connections;
CREATE POLICY "Either side sees the connection" ON supply_connections FOR SELECT
  USING (
    (supply_company_id IN (SELECT get_user_company_ids()) AND get_user_role(supply_company_id) IN ('owner', 'manager'))
    OR (contractor_company_id IN (SELECT get_user_company_ids()) AND get_user_role(contractor_company_id) IN ('owner', 'manager'))
  );

-- The supply generates a single-use code (shown once, only its hash is stored).
CREATE OR REPLACE FUNCTION create_supply_connect_code(p_company UUID, p_label TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := encode(gen_random_bytes(12), 'hex');
BEGIN
  IF auth.uid() IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) OR get_user_role(p_company) NOT IN ('owner', 'manager') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company AND kind = 'supply') THEN RAISE EXCEPTION 'not_supply'; END IF;
  INSERT INTO supply_connect_codes (supply_company_id, code_hash, label, expires_at, created_by)
  VALUES (p_company, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), left(p_label, 80), NOW() + INTERVAL '14 days', auth.uid());
  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION create_supply_connect_code(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_supply_connect_code(UUID, TEXT) TO authenticated;

-- The contractor redeems it: the supplier record becomes connected to that supply account.
CREATE OR REPLACE FUNCTION redeem_supply_code(p_company UUID, p_code TEXT, p_supplier_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code supply_connect_codes%ROWTYPE;
  v_supply_name TEXT;
  v_supplier UUID;
  v_conn UUID;
BEGIN
  IF auth.uid() IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) OR get_user_role(p_company) NOT IN ('owner', 'manager') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company AND kind = 'contractor') THEN RAISE EXCEPTION 'not_contractor'; END IF;
  SELECT * INTO v_code FROM supply_connect_codes
   WHERE p_code ~ '^[a-f0-9]{24}$' AND code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex') AND used_at IS NULL AND expires_at > NOW() FOR UPDATE;
  IF v_code.id IS NULL THEN RAISE EXCEPTION 'code_invalid'; END IF;
  SELECT name INTO v_supply_name FROM companies WHERE id = v_code.supply_company_id;

  IF p_supplier_id IS NOT NULL THEN
    SELECT id INTO v_supplier FROM suppliers WHERE id = p_supplier_id AND company_id = p_company;
    IF v_supplier IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
    UPDATE suppliers SET supply_company_id = v_code.supply_company_id, updated_at = NOW() WHERE id = v_supplier;
  ELSE
    INSERT INTO suppliers (company_id, created_by, name, supply_company_id) VALUES (p_company, auth.uid(), v_supply_name, v_code.supply_company_id) RETURNING id INTO v_supplier;
  END IF;

  INSERT INTO supply_connections (supply_company_id, contractor_company_id, supplier_id, status)
  VALUES (v_code.supply_company_id, p_company, v_supplier, 'active')
  ON CONFLICT (supply_company_id, contractor_company_id) DO UPDATE SET status = 'active', revoked_at = NULL, supplier_id = EXCLUDED.supplier_id
  RETURNING id INTO v_conn;
  UPDATE supply_connect_codes SET used_at = NOW(), used_by_company_id = p_company WHERE id = v_code.id;
  RETURN v_conn;
END;
$$;
REVOKE ALL ON FUNCTION redeem_supply_code(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_supply_code(UUID, TEXT, UUID) TO authenticated;

-- Either side can end the connection; already-sent requests stay in the contractor's history.
CREATE OR REPLACE FUNCTION revoke_supply_connection(p_connection UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c supply_connections%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM supply_connections WHERE id = p_connection FOR UPDATE;
  IF v_c.id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT ((v_c.supply_company_id IN (SELECT get_user_company_ids()) AND get_user_role(v_c.supply_company_id) IN ('owner', 'manager'))
       OR (v_c.contractor_company_id IN (SELECT get_user_company_ids()) AND get_user_role(v_c.contractor_company_id) IN ('owner', 'manager'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE supply_connections SET status = 'revoked', revoked_at = NOW() WHERE id = p_connection;
  UPDATE suppliers SET supply_company_id = NULL WHERE id = v_c.supplier_id AND supply_company_id = v_c.supply_company_id;
END;
$$;
REVOKE ALL ON FUNCTION revoke_supply_connection(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION revoke_supply_connection(UUID) TO authenticated;

-- =====================================================
-- IN-APP INVITATIONS (no token: the supply account is the recipient)
-- =====================================================
ALTER TABLE supplier_quote_invitations ADD COLUMN IF NOT EXISTS supply_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_invitations_supply ON supplier_quote_invitations(supply_company_id, created_at DESC) WHERE supply_company_id IS NOT NULL;

CREATE OR REPLACE FUNCTION trg_invitation_supply_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.supply_company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM supply_connections c WHERE c.contractor_company_id = NEW.company_id AND c.supply_company_id = NEW.supply_company_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'supply_not_connected';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_invitation_supply_connection() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS invitation_supply_connection ON supplier_quote_invitations;
CREATE TRIGGER invitation_supply_connection BEFORE INSERT OR UPDATE OF supply_company_id ON supplier_quote_invitations FOR EACH ROW EXECUTE FUNCTION trg_invitation_supply_connection();

ALTER TABLE supplier_quote_responses DROP CONSTRAINT IF EXISTS supplier_quote_responses_source_check;
ALTER TABLE supplier_quote_responses ADD CONSTRAINT supplier_quote_responses_source_check CHECK (source IN ('manual', 'link', 'pdf', 'supply'));

-- =====================================================
-- ONE IMPLEMENTATION FOR LINK AND ACCOUNT
-- =====================================================
CREATE OR REPLACE FUNCTION _supplier_view(v_inv supplier_quote_invitations, p_authed BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req supply_quote_requests%ROWTYPE;
  v_company TEXT;
  v_resp supplier_quote_responses%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM supply_quote_requests WHERE id = v_inv.request_id;
  SELECT name INTO v_company FROM companies WHERE id = v_req.company_id;

  UPDATE supplier_quote_invitations SET first_opened_at = COALESCE(first_opened_at, NOW()), last_opened_at = NOW() WHERE id = v_inv.id;
  IF v_inv.first_opened_at IS NULL THEN
    INSERT INTO quote_activity_log (company_id, request_id, event, metadata) VALUES (v_req.company_id, v_req.id, 'supplier_opened', jsonb_build_object('supplier', v_inv.supplier_name));
  END IF;
  SELECT * INTO v_resp FROM supplier_quote_responses WHERE invitation_id = v_inv.id ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'company', v_company,
    'supplier_name', v_inv.supplier_name,
    'open', v_req.status IN ('sent', 'viewed', 'response_started', 'question_open', 'responded') AND COALESCE(v_resp.status, 'submitted') = 'submitted',
    'request', jsonb_build_object(
      'number', v_req.number, 'type', v_req.request_type, 'title', v_req.title, 'bid_date', v_req.response_due_date,
      'notes', v_req.notes, 'links', v_req.links, 'delivery_method', v_req.delivery_method, 'delivery_address', v_req.delivery_address),
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'description', i.description, 'quantity', i.quantity, 'unit', i.unit, 'manufacturer', i.manufacturer,
        'catalog_number', i.catalog_number, 'notes', i.notes, 'allow_substitution', i.allow_substitution) ORDER BY i.sort_order)
      FROM supply_quote_request_items i WHERE i.request_id = v_req.id), '[]'::jsonb),
    'questions', COALESCE((SELECT jsonb_agg(jsonb_build_object('author', q.author, 'body', q.body, 'created_at', q.created_at) ORDER BY q.created_at)
      FROM pricing_request_questions q WHERE q.invitation_id = v_inv.id), '[]'::jsonb),
    'files', CASE WHEN p_authed THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'mime_type', a.mime_type, 'path', a.storage_path) ORDER BY a.created_at)
      FROM supplier_quote_attachments a WHERE a.request_id = v_req.id AND a.response_id IS NULL), '[]'::jsonb) ELSE '[]'::jsonb END,
    'response', CASE WHEN v_resp.id IS NULL THEN NULL ELSE jsonb_build_object(
      'quote_number', v_resp.quote_number, 'total_amount', v_resp.total_amount, 'freight', v_resp.freight,
      'tax_amount', v_resp.tax_amount, 'expires_on', v_resp.expires_on, 'notes', v_resp.notes, 'status', v_resp.status,
      'lines', COALESCE((SELECT jsonb_agg(jsonb_build_object('request_item_id', l.request_item_id, 'unit_price', l.unit_price, 'availability', l.availability, 'lead_time', l.lead_time, 'notes', l.notes))
        FROM supplier_quote_response_items l WHERE l.response_id = v_resp.id), '[]'::jsonb)) END
  );
END;
$$;
REVOKE ALL ON FUNCTION _supplier_view(supplier_quote_invitations, BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION _supplier_submit(v_inv supplier_quote_invitations, p_payload JSONB, p_source TEXT, p_default_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req supply_quote_requests%ROWTYPE;
  v_resp UUID;
  v_line JSONB;
  v_item UUID;
  v_lines JSONB := COALESCE(p_payload -> 'lines', '[]'::jsonb);
  v_total NUMERIC; v_freight NUMERIC; v_tax NUMERIC; v_price NUMERIC; v_avail TEXT;
BEGIN
  SELECT * INTO v_req FROM supply_quote_requests WHERE id = v_inv.request_id FOR UPDATE;
  IF v_req.status NOT IN ('sent', 'viewed', 'response_started', 'question_open', 'responded') THEN RAISE EXCEPTION 'request_closed'; END IF;
  IF EXISTS (SELECT 1 FROM supplier_quote_responses WHERE invitation_id = v_inv.id AND status <> 'submitted') THEN RAISE EXCEPTION 'response_locked'; END IF;
  IF jsonb_typeof(v_lines) <> 'array' OR jsonb_array_length(v_lines) > 300 THEN RAISE EXCEPTION 'invalid_payload'; END IF;

  v_total := NULLIF(p_payload ->> 'total_amount', '')::NUMERIC;
  v_freight := NULLIF(p_payload ->> 'freight', '')::NUMERIC;
  v_tax := NULLIF(p_payload ->> 'tax_amount', '')::NUMERIC;
  IF v_total < 0 OR v_total > 100000000 OR v_freight < 0 OR v_freight > 100000000 OR v_tax < 0 OR v_tax > 100000000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  IF char_length(COALESCE(p_payload ->> 'notes', '')) > 2000 OR char_length(COALESCE(p_payload ->> 'quote_number', '')) > 60 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  IF v_total IS NULL AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) e WHERE NULLIF(e ->> 'unit_price', '') IS NOT NULL OR NULLIF(e ->> 'availability', '') IS NOT NULL) THEN RAISE EXCEPTION 'response_empty'; END IF;

  DELETE FROM supplier_quote_responses WHERE invitation_id = v_inv.id AND status = 'submitted';
  INSERT INTO supplier_quote_responses (company_id, request_id, invitation_id, supplier_id, supplier_name, supplier_contact_name, supplier_email,
    status, freight, tax_amount, total_amount, quote_number, expires_on, notes, source, submitted_at)
  VALUES (v_req.company_id, v_req.id, v_inv.id, v_inv.supplier_id,
    COALESCE(NULLIF(left(p_payload ->> 'supplier_name', 120), ''), NULLIF(v_inv.supplier_name, ''), p_default_name, 'Supplier'),
    left(p_payload ->> 'contact_name', 120), left(COALESCE(p_payload ->> 'email', v_inv.supplier_email), 200),
    'submitted', v_freight, v_tax, v_total, NULLIF(left(p_payload ->> 'quote_number', 60), ''),
    NULLIF(p_payload ->> 'expires_on', '')::DATE, NULLIF(left(p_payload ->> 'notes', 2000), ''), p_source, NOW())
  RETURNING id INTO v_resp;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
    v_item := NULLIF(v_line ->> 'request_item_id', '')::UUID;
    IF NOT EXISTS (SELECT 1 FROM supply_quote_request_items WHERE id = v_item AND request_id = v_req.id) THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    v_price := NULLIF(v_line ->> 'unit_price', '')::NUMERIC;
    IF v_price < 0 OR v_price > 100000000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    v_avail := NULLIF(v_line ->> 'availability', '');
    IF v_avail IS NOT NULL AND v_avail NOT IN ('available', 'partial', 'unavailable') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF v_price IS NULL AND v_avail IS NULL AND NULLIF(v_line ->> 'lead_time', '') IS NULL AND NULLIF(v_line ->> 'notes', '') IS NULL THEN CONTINUE; END IF;
    INSERT INTO supplier_quote_response_items (company_id, response_id, request_item_id, unit_price, availability, lead_time, notes)
    VALUES (v_req.company_id, v_resp, v_item, v_price, v_avail, NULLIF(left(v_line ->> 'lead_time', 80), ''), NULLIF(left(v_line ->> 'notes', 500), ''))
    ON CONFLICT (response_id, request_item_id) DO UPDATE SET unit_price = EXCLUDED.unit_price, availability = EXCLUDED.availability, lead_time = EXCLUDED.lead_time, notes = EXCLUDED.notes;
  END LOOP;

  UPDATE supply_quote_requests SET status = 'responded', waiting_on = 'owner', responded_at = NOW(), updated_at = NOW() WHERE id = v_req.id;
  INSERT INTO quote_activity_log (company_id, request_id, event, metadata) VALUES (v_req.company_id, v_req.id, 'supplier_responded', jsonb_build_object('supplier', v_inv.supplier_name));
END;
$$;
REVOKE ALL ON FUNCTION _supplier_submit(supplier_quote_invitations, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION _supplier_ask(v_inv supplier_quote_invitations, p_body TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req supply_quote_requests%ROWTYPE;
  v_body TEXT := btrim(COALESCE(p_body, ''));
BEGIN
  SELECT * INTO v_req FROM supply_quote_requests WHERE id = v_inv.request_id FOR UPDATE;
  IF v_req.status NOT IN ('sent', 'viewed', 'response_started', 'question_open', 'responded') THEN RAISE EXCEPTION 'request_closed'; END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 2000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  IF (SELECT count(*) FROM pricing_request_questions WHERE invitation_id = v_inv.id AND author = 'supplier') >= 30 THEN RAISE EXCEPTION 'too_many'; END IF;
  INSERT INTO pricing_request_questions (company_id, request_id, invitation_id, author, author_name, body) VALUES (v_req.company_id, v_req.id, v_inv.id, 'supplier', v_inv.supplier_name, v_body);
  IF v_req.status IN ('sent', 'viewed', 'response_started', 'question_open') THEN
    UPDATE supply_quote_requests SET status = 'question_open', waiting_on = 'owner', updated_at = NOW() WHERE id = v_req.id;
  END IF;
  INSERT INTO quote_activity_log (company_id, request_id, event, metadata) VALUES (v_req.company_id, v_req.id, 'supplier_question', jsonb_build_object('supplier', v_inv.supplier_name));
END;
$$;
REVOKE ALL ON FUNCTION _supplier_ask(supplier_quote_invitations, TEXT) FROM PUBLIC, anon, authenticated;

-- Secure link (unchanged behavior, now a thin wrapper).
CREATE OR REPLACE FUNCTION supplier_get_request(p_token TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv supplier_quote_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM _supplier_invitation(p_token);
  IF v_inv.id IS NULL THEN RETURN NULL; END IF;
  RETURN _supplier_view(v_inv, false);
END; $$;
CREATE OR REPLACE FUNCTION supplier_submit_response(p_token TEXT, p_payload JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv supplier_quote_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM _supplier_invitation(p_token);
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  PERFORM _supplier_submit(v_inv, p_payload, 'link', NULL);
END; $$;
CREATE OR REPLACE FUNCTION supplier_ask_question(p_token TEXT, p_body TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv supplier_quote_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM _supplier_invitation(p_token);
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  PERFORM _supplier_ask(v_inv, p_body);
END; $$;
GRANT EXECUTE ON FUNCTION supplier_get_request(TEXT), supplier_submit_response(TEXT, JSONB), supplier_ask_question(TEXT, TEXT) TO anon, authenticated;

-- =====================================================
-- SUPPLY ACCOUNT (authenticated, membership + active connection)
-- =====================================================
CREATE OR REPLACE FUNCTION _supply_invitation(p_invitation UUID)
RETURNS supplier_quote_invitations
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.* FROM supplier_quote_invitations i
   WHERE i.id = p_invitation AND i.revoked_at IS NULL AND i.supply_company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND i.supply_company_id IN (SELECT get_user_company_ids())
     AND get_user_role(i.supply_company_id) IN ('owner', 'manager')
     AND EXISTS (SELECT 1 FROM companies c WHERE c.id = i.supply_company_id AND c.kind = 'supply')
     AND EXISTS (SELECT 1 FROM supply_connections sc WHERE sc.supply_company_id = i.supply_company_id AND sc.contractor_company_id = i.company_id AND sc.status = 'active');
$$;
REVOKE ALL ON FUNCTION _supply_invitation(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION supply_get_request(p_invitation UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv supplier_quote_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM _supply_invitation(p_invitation);
  IF v_inv.id IS NULL THEN RETURN NULL; END IF;
  RETURN _supplier_view(v_inv, true);
END; $$;
CREATE OR REPLACE FUNCTION supply_submit_response(p_invitation UUID, p_payload JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv supplier_quote_invitations%ROWTYPE; v_name TEXT;
BEGIN
  SELECT * INTO v_inv FROM _supply_invitation(p_invitation);
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  SELECT name INTO v_name FROM companies WHERE id = v_inv.supply_company_id;
  PERFORM _supplier_submit(v_inv, p_payload, 'supply', v_name);
END; $$;
CREATE OR REPLACE FUNCTION supply_ask_question(p_invitation UUID, p_body TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv supplier_quote_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM _supply_invitation(p_invitation);
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid_link'; END IF;
  PERFORM _supplier_ask(v_inv, p_body);
END; $$;
REVOKE ALL ON FUNCTION supply_get_request(UUID), supply_submit_response(UUID, JSONB), supply_ask_question(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION supply_get_request(UUID), supply_submit_response(UUID, JSONB), supply_ask_question(UUID, TEXT) TO authenticated;

-- Inbox: incoming Pricing Requests with Bid Date and the supply's own quote status.
CREATE OR REPLACE FUNCTION supply_inbox(p_company UUID)
RETURNS TABLE (
  invitation_id UUID, contractor_name TEXT, request_number TEXT, title TEXT, request_type TEXT, bid_date DATE, request_status TEXT,
  item_count BIGINT, received_at TIMESTAMPTZ, opened_at TIMESTAMPTZ, response_status TEXT, quote_number TEXT, quote_total NUMERIC, question_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.id, c.name, r.number, r.title, r.request_type, r.response_due_date, r.status,
         (SELECT count(*) FROM supply_quote_request_items x WHERE x.request_id = r.id),
         i.created_at, i.first_opened_at,
         resp.status, resp.quote_number, resp.total_amount,
         (SELECT count(*) FROM pricing_request_questions q WHERE q.invitation_id = i.id AND q.author = 'supplier')
    FROM supplier_quote_invitations i
    JOIN supply_quote_requests r ON r.id = i.request_id
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN LATERAL (SELECT s.status, s.quote_number, s.total_amount FROM supplier_quote_responses s WHERE s.invitation_id = i.id ORDER BY s.created_at DESC LIMIT 1) resp ON true
   WHERE i.supply_company_id = p_company AND i.revoked_at IS NULL AND r.status <> 'draft'
     AND auth.uid() IS NOT NULL AND p_company IN (SELECT get_user_company_ids()) AND get_user_role(p_company) IN ('owner', 'manager')
     AND EXISTS (SELECT 1 FROM supply_connections sc WHERE sc.supply_company_id = p_company AND sc.contractor_company_id = i.company_id AND sc.status = 'active')
   ORDER BY (r.response_due_date IS NULL), r.response_due_date, i.created_at DESC;
$$;
REVOKE ALL ON FUNCTION supply_inbox(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION supply_inbox(UUID) TO authenticated;

-- Contractor accounts connected to this supply, with activity counters (no contractor data beyond the name).
CREATE OR REPLACE FUNCTION supply_contractors(p_company UUID)
RETURNS TABLE (connection_id UUID, contractor_name TEXT, status TEXT, connected_at TIMESTAMPTZ, requests_received BIGINT, quotes_sent BIGINT, quotes_awarded BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT sc.id, c.name, sc.status, sc.created_at,
         (SELECT count(*) FROM supplier_quote_invitations i WHERE i.supply_company_id = sc.supply_company_id AND i.company_id = sc.contractor_company_id AND i.revoked_at IS NULL),
         (SELECT count(*) FROM supplier_quote_responses s JOIN supplier_quote_invitations i ON i.id = s.invitation_id WHERE i.supply_company_id = sc.supply_company_id AND i.company_id = sc.contractor_company_id),
         (SELECT count(*) FROM supplier_quote_responses s JOIN supplier_quote_invitations i ON i.id = s.invitation_id WHERE i.supply_company_id = sc.supply_company_id AND i.company_id = sc.contractor_company_id AND s.status = 'accepted')
    FROM supply_connections sc JOIN companies c ON c.id = sc.contractor_company_id
   WHERE sc.supply_company_id = p_company AND auth.uid() IS NOT NULL AND p_company IN (SELECT get_user_company_ids()) AND get_user_role(p_company) IN ('owner', 'manager')
   ORDER BY c.name;
$$;
REVOKE ALL ON FUNCTION supply_contractors(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION supply_contractors(UUID) TO authenticated;

-- Plans/specs the contractor attached to the request are readable by the supply that received it (and nobody else).
CREATE OR REPLACE FUNCTION supply_can_read_file(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM supplier_quote_attachments a
      JOIN supplier_quote_invitations i ON i.request_id = a.request_id
     WHERE a.storage_path = p_path AND a.response_id IS NULL
       AND i.revoked_at IS NULL AND i.supply_company_id IS NOT NULL
       AND i.supply_company_id IN (SELECT get_user_company_ids())
       AND get_user_role(i.supply_company_id) IN ('owner', 'manager')
       AND EXISTS (SELECT 1 FROM supply_connections sc WHERE sc.supply_company_id = i.supply_company_id AND sc.contractor_company_id = i.company_id AND sc.status = 'active')
  );
$$;
REVOKE ALL ON FUNCTION supply_can_read_file(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION supply_can_read_file(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Supply reads request files" ON storage.objects;
CREATE POLICY "Supply reads request files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.supply_can_read_file(name));

-- ===== supabase/migrations/20260811000021_phase10_accounting_export.sql =====
-- BidPower — Phase 10: Accounting Export / QuickBooks readiness
--
-- BidPower is not accounting software. It captures operational data and hands it to the accounting system.
-- This phase adds the two pieces of plumbing a hand-off needs, nothing more:
--   * accounting_export_log: who exported which dataset, when, with which filters and how many rows
--   * external_refs: the id of a BidPower record in an outside system (e.g. QuickBooks) so a future sync can
--     update instead of duplicate. It stays empty until a live connection exists.
-- Only the Owner, or a Manager who may view costs, can export or read these tables. RLS stays enabled.

CREATE TABLE IF NOT EXISTS accounting_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dataset TEXT NOT NULL CHECK (dataset IN ('customers', 'vendors', 'projects', 'expenses', 'purchase_orders', 'invoices', 'project_costs', 'all')),
  format TEXT NOT NULL CHECK (format IN ('csv', 'json')),
  date_from DATE,
  date_to DATE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  exported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_export_log_company ON accounting_export_log(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS external_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'vendor', 'project', 'expense', 'purchase_order', 'invoice')),
  entity_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('quickbooks')),
  external_id TEXT NOT NULL,
  sync_token TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, provider, entity_type, entity_id),
  UNIQUE (company_id, provider, entity_type, external_id)
);

ALTER TABLE accounting_export_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_refs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_export_accounting(p_company UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p_company IN (SELECT get_user_company_ids())
     AND (get_user_role(p_company) = 'owner' OR (get_user_role(p_company) = 'manager' AND has_permission(p_company, 'can_view_costs')))
     AND EXISTS (SELECT 1 FROM companies c WHERE c.id = p_company AND c.kind = 'contractor');
$$;
REVOKE ALL ON FUNCTION can_export_accounting(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_export_accounting(UUID) TO authenticated;

DROP POLICY IF EXISTS "Export log readable by exporters" ON accounting_export_log;
CREATE POLICY "Export log readable by exporters" ON accounting_export_log FOR SELECT USING (can_export_accounting(company_id));
DROP POLICY IF EXISTS "Exporters log their own exports" ON accounting_export_log;
CREATE POLICY "Exporters log their own exports" ON accounting_export_log FOR INSERT WITH CHECK (can_export_accounting(company_id) AND exported_by = auth.uid());

DROP POLICY IF EXISTS "External refs managed by exporters" ON external_refs;
CREATE POLICY "External refs managed by exporters" ON external_refs FOR ALL USING (can_export_accounting(company_id)) WITH CHECK (can_export_accounting(company_id));

-- ===== supabase/migrations/20260812000022_po_expected_delivery.sql =====
-- BidPower — PO logistics: when is the material expected?
-- The Owner/Manager (or whoever may send POs) sets the expected delivery date on an approved or sent PO.
-- It feeds Needs Attention (late / due today / due tomorrow) and the PO screens. No status rule changes.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery DATE;
CREATE INDEX IF NOT EXISTS idx_po_expected_delivery ON purchase_orders(company_id, expected_delivery) WHERE expected_delivery IS NOT NULL;

-- ===== supabase/migrations/20260813000023_po_partial_receiving.sql =====
-- BidPower — PO logistics: partial receiving.
-- People on site record how much of each line arrived (received_quantity). The PO status is unchanged; "Mark as received"
-- stays the decision that closes the delivery. Lines are otherwise read-only: a trigger blocks any change except received_quantity.

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE purchase_order_items ADD CONSTRAINT po_items_received_range CHECK (received_quantity >= 0 AND received_quantity <= quantity);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION trg_po_items_receive_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.purchase_order_id IS DISTINCT FROM OLD.purchase_order_id
     OR NEW.request_item_id IS DISTINCT FROM OLD.request_item_id OR NEW.material_id IS DISTINCT FROM OLD.material_id OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.unit IS DISTINCT FROM OLD.unit OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
     OR NEW.lead_time IS DISTINCT FROM OLD.lead_time OR NEW.sort_order IS DISTINCT FROM OLD.sort_order THEN
    RAISE EXCEPTION 'po_items_locked';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_po_items_receive_only() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS po_items_receive_only ON purchase_order_items;
CREATE TRIGGER po_items_receive_only BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION trg_po_items_receive_only();

-- Whoever can see the PO can record what arrived, only while the PO waits for delivery.
DROP POLICY IF EXISTS "Record received quantities" ON purchase_order_items;
CREATE POLICY "Record received quantities" ON purchase_order_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM purchase_orders p WHERE p.id = purchase_order_items.purchase_order_id AND p.company_id = purchase_order_items.company_id AND p.status IN ('approved', 'sent')))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders p WHERE p.id = purchase_order_items.purchase_order_id AND p.company_id = purchase_order_items.company_id AND p.status IN ('approved', 'sent')));

-- ===== supabase/migrations/20260814000024_feedback.sql =====
-- BidPower — in-app feedback for the first user interviews.
-- A person can leave a comment from any screen and read back their own; the team reads them in the database.

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page TEXT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_company ON feedback(company_id, created_at DESC);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members leave feedback" ON feedback;
CREATE POLICY "Members leave feedback" ON feedback FOR INSERT WITH CHECK (user_id = auth.uid() AND company_id IN (SELECT get_user_company_ids()));
DROP POLICY IF EXISTS "People read their own feedback" ON feedback;
CREATE POLICY "People read their own feedback" ON feedback FOR SELECT USING (user_id = auth.uid());

-- ===== supabase/migrations/20260815000025_supplier_contacts.sql =====
-- BidPower — Connections: a supplier has people.
-- The table supplier_contacts already exists (supplier → contacts). This migration only makes it safe to use as the
-- contractor's address book: valid emails, no duplicate contact per supplier, at most one default contact.
-- A contact is an address-book entry: nothing is sent and nothing is shared until a request is sent to it.

DO $$ BEGIN
  ALTER TABLE supplier_contacts ADD CONSTRAINT supplier_contacts_email_format
    CHECK (email IS NULL OR (char_length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_contacts_email ON supplier_contacts(supplier_id, lower(email)) WHERE email IS NOT NULL AND is_active;
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_contacts_default ON supplier_contacts(supplier_id) WHERE is_default_quote_contact AND is_active;

-- ===== supabase/migrations/20260816000026_po_pending_receipts_block.sql =====
-- BidPower — An employee must hand in the receipt (photo) of what they bought before buying more.
-- Rule: an employee with 2 or more of their own purchase orders still waiting for the receipt cannot create another one.
-- Owners and managers are never blocked. Enforced here so it holds for every client, not only the app.

CREATE OR REPLACE FUNCTION trg_po_block_pending_receipts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending INT;
BEGIN
  IF auth.uid() IS NULL OR NEW.created_by IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF get_user_role(NEW.company_id) IS DISTINCT FROM 'employee' THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_pending FROM purchase_orders
   WHERE company_id = NEW.company_id AND created_by = auth.uid() AND status IN ('pending_document', 'received');
  IF v_pending >= 2 THEN RAISE EXCEPTION 'pending_receipts'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_po_block_pending_receipts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS po_block_pending_receipts ON purchase_orders;
CREATE TRIGGER po_block_pending_receipts BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trg_po_block_pending_receipts();

-- ===== supabase/migrations/20260817000027_proposal_approved_sets_contract.sql =====
-- BidPower — An approved proposal moves its project forward.
-- The customer's link already does this. This trigger makes the same happen when the proposal is approved by hand:
-- a project without a contract value takes the proposal's total, and a lead/quoted project becomes approved.
-- A contract value someone already set is never overwritten.

CREATE OR REPLACE FUNCTION trg_quote_approved_updates_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL OR NEW.status IS DISTINCT FROM 'approved' OR OLD.status IS NOT DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;
  UPDATE projects
     SET contract_value = CASE WHEN COALESCE(contract_value, 0) = 0 THEN NEW.total ELSE contract_value END,
         status = CASE WHEN status IN ('lead', 'quoted') THEN 'approved' ELSE status END,
         updated_at = NOW()
   WHERE id = NEW.project_id AND company_id = NEW.company_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION trg_quote_approved_updates_project() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quote_approved_updates_project ON quotes;
CREATE TRIGGER quote_approved_updates_project AFTER UPDATE OF status ON quotes
  FOR EACH ROW EXECUTE FUNCTION trg_quote_approved_updates_project();

-- ===== supabase/migrations/20260818000028_po_no_exception_states.sql =====
-- BidPower — The receipt is mandatory, so the "exception" way around it is closed.
-- The three exception statuses stay in the status list (existing rows, if any, keep working) but no purchase order can
-- enter them any more. A small trigger is used instead of rewriting the whole transition rules.

CREATE OR REPLACE FUNCTION trg_po_no_exception_states()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('exception_requested', 'exception_approved', 'exception_rejected')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    RAISE EXCEPTION 'po_exception_removed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS po_no_exception_states ON purchase_orders;
CREATE TRIGGER po_no_exception_states BEFORE INSERT OR UPDATE OF status ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trg_po_no_exception_states();

-- ===== supabase/migrations/20260819000029_atomic_document_numbers.sql =====
-- BidPower — Document numbers that cannot repeat.
-- Until now each "next number" was computed as MAX+1 inside its own short transaction and used later by another request,
-- so two people creating a document at the same moment could get the same number (the unique rule then made one fail).
-- A counter row per company, kind and year is raised atomically instead: two callers can never receive the same value.

CREATE TABLE IF NOT EXISTS number_counters (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 0,
  last_value INTEGER NOT NULL,
  PRIMARY KEY (company_id, kind, year)
);
ALTER TABLE number_counters ENABLE ROW LEVEL SECURITY;  -- no policies: only the functions below touch it

-- p_floor is the highest number already used by existing rows, so the counter never falls behind them.
CREATE OR REPLACE FUNCTION bump_number(p_company UUID, p_kind TEXT, p_year INTEGER, p_floor INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value INTEGER;
BEGIN
  INSERT INTO number_counters AS n (company_id, kind, year, last_value)
  VALUES (p_company, p_kind, p_year, p_floor + 1)
  ON CONFLICT (company_id, kind, year) DO UPDATE SET last_value = GREATEST(n.last_value, p_floor) + 1
  RETURNING n.last_value INTO v_value;
  RETURN v_value;
END;
$$;
REVOKE ALL ON FUNCTION bump_number(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION next_purchase_order_number(p_company UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year TEXT := to_char(NOW(), 'YYYY'); v_max INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^PO-' || v_year || '-', ''), number)::INTEGER), 0) INTO v_max FROM purchase_orders WHERE company_id = p_company AND number LIKE 'PO-' || v_year || '-%';
  RETURN 'PO-' || v_year || '-' || lpad(bump_number(p_company, 'po', v_year::INTEGER, v_max)::text, 5, '0');
END; $$;

CREATE OR REPLACE FUNCTION next_material_request_number(p_company UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year TEXT := to_char(NOW(), 'YYYY'); v_max INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^MR-' || v_year || '-', ''), number)::INTEGER), 0) INTO v_max FROM material_requests WHERE company_id = p_company AND number LIKE 'MR-' || v_year || '-%';
  RETURN 'MR-' || v_year || '-' || lpad(bump_number(p_company, 'mr', v_year::INTEGER, v_max)::text, 5, '0');
END; $$;

CREATE OR REPLACE FUNCTION next_pricing_request_number(p_company UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year TEXT := to_char(NOW(), 'YYYY'); v_max INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^PR-' || v_year || '-', ''), number)::INTEGER), 0) INTO v_max FROM supply_quote_requests WHERE company_id = p_company AND number LIKE 'PR-' || v_year || '-%';
  RETURN 'PR-' || v_year || '-' || lpad(bump_number(p_company, 'pr', v_year::INTEGER, v_max)::text, 5, '0');
END; $$;

CREATE OR REPLACE FUNCTION next_quote_number(p_company UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year TEXT := to_char(NOW(), 'YYYY'); v_max INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^QT-' || v_year || '-', ''), number)::INTEGER), 0) INTO v_max FROM quotes WHERE company_id = p_company AND number LIKE 'QT-' || v_year || '-%';
  RETURN 'QT-' || v_year || '-' || lpad(bump_number(p_company, 'qt', v_year::INTEGER, v_max)::text, 4, '0');
END; $$;

CREATE OR REPLACE FUNCTION next_invoice_number(p_company UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max INTEGER;
BEGIN
  IF p_company IS NULL OR p_company NOT IN (SELECT get_user_company_ids()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(substring(number from '^INV-(\d{1,9})$')::INTEGER), 0) INTO v_max FROM invoices WHERE company_id = p_company AND number ~ '^INV-\d{1,9}$';
  RETURN 'INV-' || lpad(bump_number(p_company, 'inv', 0, v_max)::text, 4, '0');
END; $$;
REVOKE ALL ON FUNCTION next_invoice_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO authenticated;

-- A payment is added to the invoice in one statement, so two payments at the same moment both count.
-- It runs with the caller's own rights (row security still decides who may touch the invoice).
CREATE OR REPLACE FUNCTION record_invoice_payment(p_invoice UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  UPDATE invoices
     SET amount_paid = LEAST(total, amount_paid + p_amount),
         status = CASE WHEN LEAST(total, amount_paid + p_amount) >= total THEN 'paid' ELSE 'partial' END,
         updated_at = NOW()
   WHERE id = p_invoice AND status <> 'cancelled';
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_transition_invalid'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION record_invoice_payment(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_invoice_payment(UUID, NUMERIC) TO authenticated;

-- ===== supabase/migrations/20260820000030_clients_visibility.sql =====
-- BidPower — Customers are not for every member.
-- Until now any member of the company (including field employees) could read the whole customer list through the API.
-- Owners and managers keep seeing every client. Anyone else sees only the clients of the projects they can already see
-- (their assigned projects), which is what they need on the job site.

DROP POLICY IF EXISTS "Members can view clients" ON clients;
DROP POLICY IF EXISTS "Members can view company data" ON clients;
DROP POLICY IF EXISTS "Clients visible by role or project" ON clients;

CREATE POLICY "Clients visible by role or project"
  ON clients FOR SELECT
  USING (
    company_id IN (SELECT get_user_company_ids())
    AND (
      get_user_role(company_id) IN ('owner', 'manager')
      OR id IN (SELECT client_id FROM projects)  -- projects already limits employees to their assignments
    )
  );
