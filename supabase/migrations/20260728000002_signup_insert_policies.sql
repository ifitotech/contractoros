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
