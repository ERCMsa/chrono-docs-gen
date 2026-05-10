
-- Add foreign keys to enable PostgREST joins (fixes 400 errors on absences/conges queries)
ALTER TABLE public.absences
  ADD CONSTRAINT absences_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;

ALTER TABLE public.conges
  ADD CONSTRAINT conges_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;

-- Contract tracking on workers
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS duree_contrat text,
  ADD COLUMN IF NOT EXISTS date_debut_contrat date,
  ADD COLUMN IF NOT EXISTS date_fin_contrat date;
