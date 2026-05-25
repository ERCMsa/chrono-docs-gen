-- Helper: get current user's role without recursing RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ============= WORKERS RLS (department-scoped) =============
DROP POLICY IF EXISTS "Anyone can read workers" ON public.workers;
DROP POLICY IF EXISTS "Anyone can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Anyone can update workers" ON public.workers;
DROP POLICY IF EXISTS "Anyone can delete workers" ON public.workers;

CREATE POLICY "Workers select scoped"
  ON public.workers FOR SELECT
  USING (
    public.current_user_role() IN ('ADMIN','RH')
    OR department = public.current_user_role()::text
  );

CREATE POLICY "Workers insert scoped"
  ON public.workers FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('ADMIN','RH')
    OR department = public.current_user_role()::text
  );

CREATE POLICY "Workers update scoped"
  ON public.workers FOR UPDATE
  USING (
    public.current_user_role() IN ('ADMIN','RH')
    OR department = public.current_user_role()::text
  );

CREATE POLICY "Workers delete scoped"
  ON public.workers FOR DELETE
  USING (
    public.current_user_role() IN ('ADMIN','RH')
    OR department = public.current_user_role()::text
  );

-- ============= DOCUMENTS validation schema =============
DO $$ BEGIN
  CREATE TYPE public.validation_status AS ENUM ('PENDING','VALIDATED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS status public.validation_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill from old validation columns when present
UPDATE public.documents
  SET status = 'VALIDATED'
  WHERE status = 'PENDING' AND validated_by_rh = true;

-- ============= DOCUMENTS RLS =============
DROP POLICY IF EXISTS "Anyone can read documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can update documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can delete documents" ON public.documents;

CREATE POLICY "Documents select scoped"
  ON public.documents FOR SELECT
  USING (
    public.current_user_role() IN ('ADMIN','RH')
    OR EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = documents.worker_id
        AND w.department = public.current_user_role()::text
    )
  );

CREATE POLICY "Documents insert scoped"
  ON public.documents FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('ADMIN','RH')
    OR EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = documents.worker_id
        AND w.department = public.current_user_role()::text
    )
  );

CREATE POLICY "Documents update scoped"
  ON public.documents FOR UPDATE
  USING (
    public.current_user_role() IN ('ADMIN','RH')
    OR EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = documents.worker_id
        AND w.department = public.current_user_role()::text
    )
  );

CREATE POLICY "Documents delete scoped"
  ON public.documents FOR DELETE
  USING (
    public.current_user_role() IN ('ADMIN','RH')
    OR EXISTS (
      SELECT 1 FROM public.workers w
      WHERE w.id = documents.worker_id
        AND w.department = public.current_user_role()::text
    )
  );

-- ============= Realtime =============
ALTER TABLE public.documents REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
