# Japan Auto Import UI v0.6.15

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

## v0.6.14 changes
- Filter sidebar is sticky on larger/tablet layouts and has its own independent vertical scroll.
- On mobile the filter drawer remains independently scrollable.
- Cars with a base purchase price above €10,000 include an internal 2% margin calculated on the landed cost (purchase + documents + transport), added to the displayed purchase price; the fixed €1,000 commission remains separate and is shown separately.

## v0.6.15 changes
- Desktop/tablet filter sidebar uses a viewport-sized independent scroll area so the full filter stack remains accessible while the vehicle catalog scrolls separately.
- Brand and model selectors are dropdowns populated from active Japanese inventory in Supabase; model choices are narrowed by the selected brand.
- Stock number remains a separate optional text filter.
