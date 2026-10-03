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
