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
