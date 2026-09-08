# Japan Auto Import UI v0.6.1

Patch release fixing a runtime crash caused by missing SelectField and NumberField component definitions in `app/page.tsx`.

Also keeps the v0.6 filter set, real Supabase data, and pricing UI.

Run locally:

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000`.

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
