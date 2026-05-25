# Plan: Replace Clerk with Supabase Auth + Role-Based Permissions

This is a large refactor. I want to confirm the approach before touching the codebase.

## Overview

Remove Clerk entirely and rebuild the auth layer on Supabase Auth, using username-only login (mapped to fake emails `{username}@ercmsa.internal`). Add a profiles + permissions schema, an AuthContext, route guards, and an Admin Permissions panel. All existing data (workers, documents, acomptes, etc.) stays untouched.

## Steps

### 1. Database migration (Supabase)
- Create `user_role` enum (12 roles per spec)
- Create `profiles` table (id → auth.users, username unique, full_name, role, is_active)
- Create `permissions` table (user_id, module, can_view/create/edit/delete, unique pair)
- Add `has_role()` SECURITY DEFINER function (avoid recursive RLS)
- Add `handle_new_user()` trigger to auto-create a profile row from `auth.users` metadata
- RLS policies using `has_role()` (admin manage all, users read own)

### 2. Remove Clerk
- Uninstall `@clerk/clerk-react`
- Remove `VITE_CLERK_PUBLISHABLE_KEY` references
- Rewrite `App.tsx`: drop `ClerkProvider`, `SignedIn`, `SignedOut`, `RedirectToSignIn`
- Rewrite `Header.tsx`: drop `UserButton`/`SignInButton`, show username + role badge + logout
- Update `DocumentView.tsx`: replace `useUser()` with custom `useAuth()` (uses profile.full_name to match worker for validation logic)

### 3. Auth layer
- `src/contexts/AuthContext.tsx`: session + profile + permissions, `hasPermission()`, `isAdmin()`, `signIn(username, password)`, `signOut()`
- `src/hooks/useAuth.ts`: re-export from context
- `src/components/PrivateRoute.tsx`: gate routes on session
- `src/components/PermissionGate.tsx`: gate UI on module/action
- `src/pages/Login.tsx`: username + password form, no signup link
- `src/pages/Forbidden.tsx`: "Accès refusé"

### 4. Routing
- `App.tsx`: wrap routes in `AuthProvider`. Public route `/login`. All others wrapped by `PrivateRoute`. `/admin/permissions` additionally requires admin.

### 5. Admin Permissions panel
- `src/pages/AdminPermissions.tsx`: user table + permission editor with checkboxes for the 12 modules
- Create user, change role, toggle active (via edge function)

### 6. Edge function `create-user`
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Validates caller is ADMIN (via `getClaims` + profile lookup)
- Creates auth user with `email_confirm: true`, inserts into profiles
- Also handles deactivate / role change (or split functions)

### 7. Sidebar
- Filter nav items by `hasPermission(module, 'view')`
- Add "Permissions" item visible to ADMIN only
- Map existing nav: Workers→employees, Acomptes→payroll, Conges/Absences→leave, Documents+Generate→documents, Statistics→reports, Dashboard always visible

### 8. Auth config
- Call `configure_auth` with `auto_confirm_email: true` (required because we use fake emails)

## Technical notes

- Clerk publishable key memory rule no longer applies after this refactor — I'll update `mem://index.md` to remove that constraint.
- `DocumentView` currently matches the Clerk username to `workers.full_name` to decide who can validate. I'll preserve that logic but source the name from `profiles.full_name` (or `username`) instead.
- Existing permissive "Anyone can …" RLS on workers/documents/etc. stays untouched — the spec says don't break existing data models.
- Bootstrap: the very first ADMIN must be promoted manually (I'll provide a one-line SQL the user runs after creating their first account, or seed a default admin). I'll include this in the migration as a note.

## Files to create
- `supabase/migrations/<ts>_auth_rbac.sql`
- `supabase/functions/create-user/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/PrivateRoute.tsx`
- `src/components/PermissionGate.tsx`
- `src/pages/Login.tsx`
- `src/pages/Forbidden.tsx`
- `src/pages/AdminPermissions.tsx`
- `src/lib/permissions.ts` (module list + labels)

## Files to edit
- `src/App.tsx`, `src/components/Header.tsx`, `src/components/AppSidebar.tsx`, `src/pages/DocumentView.tsx`, `package.json` (remove clerk), `.env` (note: managed file, will just stop referencing the var)

## One open question

How should the first ADMIN account be created? Options:
1. **Seed via SQL**: I create one admin (username `admin`, password you choose) directly in the migration.
2. **Manual promotion**: You sign up once through a temporary signup screen, then I run SQL to promote you to ADMIN and remove the signup screen.
3. **You give me a username + password now** and I'll seed it.

Please pick one (or tell me your preferred username/password for option 1/3) and confirm I can proceed with the rest.