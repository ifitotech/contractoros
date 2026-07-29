-- ContractorOS — RLS policies completas + Storage bucket
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
