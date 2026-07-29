# ContractorOS development instructions

Read `README.md` and `PROJECT_CONTEXT.md` before making significant changes.

- Preserve existing product direction and UI.
- Keep Customer Quotes separate from Supply Requests.
- Use Supabase RLS; never disable it to fix a query.
- Use migrations for database changes.
- Do not fabricate AI analysis, payments, signatures, invoices or business metrics.
- Keep mobile-first behavior, including iPhone safe areas and iPad layouts.
- Run `npm run typecheck` and `npm run build` after meaningful changes.
