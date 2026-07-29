ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_type TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_quote_type_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_quote_type_check CHECK (quote_type IN ('service', 'materials', 'plan_estimate', 'complete'));
