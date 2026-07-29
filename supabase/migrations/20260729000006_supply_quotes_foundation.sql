-- ContractorOS - Supply Quotes foundation
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
