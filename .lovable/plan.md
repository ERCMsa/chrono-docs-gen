# Plan: Department-scoped visibility + Document validation

## Part 1 — Department-scoped employee visibility

### DB migration
- The project uses `workers` (not `employees`) and `workers.department` is `text`. Keep it as text but make role-based filtering work by comparing `workers.department` (string) to `profiles.role::text`.
- Enable RLS on `workers` and replace permissive policies:
  - SELECT: allow if caller is ADMIN/RH, OR `workers.department = (select role::text from profiles where id = auth.uid())`
  - INSERT/UPDATE/DELETE: allow if ADMIN/RH, OR matches their department (so chefs can manage their team)
- Add helper SECURITY DEFINER function `current_user_role()` returning `user_role` to avoid recursive policy on profiles.

### Frontend
- Remove any manual `.eq('department', …)` filters — let RLS scope automatically.
- `Workers.tsx` header: show a department badge for non ADMIN/RH; hide/disable the department dropdown filter for them.

## Part 2 — Document validation schema

### DB migration on `documents`
- Add enum `validation_status` ('PENDING','VALIDATED','REJECTED').
- Add columns: `status validation_status default 'PENDING'`, `validated_by uuid references profiles(id)`, `validated_at timestamptz`, `rejection_reason text`.
- `owner_id` is not needed — documents already have `worker_id` linking to `workers`, which has `department`. Validation scoping will use that join.
- Backfill: existing rows where `validated_by_rh = true` → `status = 'VALIDATED'`.

### RLS for documents (replace permissive)
- SELECT: ADMIN/RH all; others only where the linked worker's department = their role.
- UPDATE: ADMIN/RH all; chefs only when worker.department = their role and status = 'PENDING'.
- INSERT/DELETE: keep current (any authenticated user; RH/ADMIN/chef of dept).

## Part 3 — Validation UI

### Documents list (`src/pages/Documents.tsx`)
- Add a Status column with badges: 🟡 EN ATTENTE / ✅ VALIDÉ / ❌ REJETÉ (replace current bon-only status).
- Action: "Valider / Rejeter" button visible when:
  - status === 'PENDING' AND (user is RH/ADMIN OR user.role === worker.department).
- Clicking opens a modal:
  - Header: employee name + document type.
  - Two buttons: Valider / Rejeter.
  - If Rejeter: required textarea "Motif du rejet".
  - Confirmer → updates `status`, `validated_by`, `validated_at`, `rejection_reason`.
- New helper `validateDocumentStatus()` in `supabase-helpers.ts`.

## Part 4 — RH global validation dashboard

- New page `src/pages/DocumentValidation.tsx` at `/documents/validation`.
- Route gated to ADMIN or RH (via PrivateRoute + custom check using `useAuth`).
- Summary cards: Total EN ATTENTE, ✅ VALIDÉS ce mois, ❌ REJETÉS ce mois.
- Filter bar: département, employé (search), type de document, plage de dates.
- Inline validate/reject actions reusing the same modal.
- "Exporter CSV" button → builds CSV client-side from filtered rows.
- Sidebar entry "Validation documents" shown only for RH/ADMIN.

## Part 5 — Realtime notifications

- Enable realtime on `documents` (publication).
- In `AuthContext` (or a small `useDocumentNotifications` hook mounted in `Layout`), subscribe to:
  - `UPDATE` on `public.documents` filtered by `validated_by` change — but owner is the worker, not the profile. Since workers aren't linked to auth users, scope the toast to chefs/RH watching their own department docs:
    - Subscribe to all UPDATEs and toast when row is in user's department and status changed to VALIDATED/REJECTED.
- Toast via existing `sonner`.

## Files

### Created
- `src/pages/DocumentValidation.tsx`
- `src/components/ValidateDocumentDialog.tsx`
- `src/hooks/useDocumentNotifications.ts`

### Edited
- `src/lib/supabase-helpers.ts` — add `validateDocumentStatus`, update `Document` typing usage.
- `src/pages/Documents.tsx` — status column + action button + dialog.
- `src/pages/Workers.tsx` — department badge for non ADMIN/RH, hide dept filter.
- `src/App.tsx` — add `/documents/validation` route.
- `src/components/AppSidebar.tsx` — add Validation entry (RH/ADMIN only).
- `src/components/Layout.tsx` — mount `useDocumentNotifications`.

### Migration
- Single SQL migration covering: helper function, workers RLS rewrite, documents schema additions + RLS rewrite, realtime publication, backfill.

## Notes / Decisions
- Kept `workers` as the employee table (the spec said "employees" but project uses `workers`).
- Used `worker.department` for scoping instead of adding `owner_id` on documents, since `documents.worker_id` already exists and `workers` already has `department`. This avoids schema duplication and keeps existing data working.
- Existing "bon de sortie/rentrée" responsible+RH validation flow remains intact (separate columns); the new `status` represents the overall validation state and is what's displayed/filtered.
