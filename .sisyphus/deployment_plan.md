# 🚀 Deployment Plan: Inventory Guardian

## 1. Backend (Supabase)
Execute the migration via SQL Editor:
`database/migrations/20260216180000_inventory_guardian.sql`

## 2. Frontend (Vercel/Netlify/Local)
- Current build is GREEN.
- Deploy the `dist/` folder.

## 3. Validation
- Create a `Procedure Type` (e.g., "Sutura").
- Create `Inventory Item` (e.g., "Fio Nylon", "Gaze").
- Link them in `Procedure Recipe`.
- Simulate a `Perform Procedure` action.
- Verify `Inventory Movement` log.

Ready for execution.
