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
