-- BidPower — The file store enforces what the app already checks, so nobody can bypass the screens.
-- Receipts, plans, logos and attachments are images or PDFs of at most 10 MB. (SVG is left out on purpose: it can carry scripts.)
UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'documents';
