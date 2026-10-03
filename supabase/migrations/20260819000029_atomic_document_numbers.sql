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
