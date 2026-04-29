-- Absences table (single-day)
CREATE TABLE public.absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  absence_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read absences" ON public.absences FOR SELECT USING (true);
CREATE POLICY "Anyone can insert absences" ON public.absences FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update absences" ON public.absences FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete absences" ON public.absences FOR DELETE USING (true);

CREATE INDEX idx_absences_worker ON public.absences(worker_id);
CREATE INDEX idx_absences_date ON public.absences(absence_date);

CREATE TRIGGER update_absences_updated_at
BEFORE UPDATE ON public.absences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Congés table (date range)
CREATE TABLE public.conges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  conge_type TEXT NOT NULL DEFAULT 'annual',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT conges_dates_valid CHECK (end_date >= start_date)
);

ALTER TABLE public.conges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read conges" ON public.conges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert conges" ON public.conges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update conges" ON public.conges FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete conges" ON public.conges FOR DELETE USING (true);

CREATE INDEX idx_conges_worker ON public.conges(worker_id);
CREATE INDEX idx_conges_dates ON public.conges(start_date, end_date);

CREATE TRIGGER update_conges_updated_at
BEFORE UPDATE ON public.conges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent overlapping conges per worker (validation trigger)
CREATE OR REPLACE FUNCTION public.check_conge_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.conges
    WHERE worker_id = NEW.worker_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT (NEW.end_date < start_date OR NEW.start_date > end_date)
  ) THEN
    RAISE EXCEPTION 'Cette période chevauche un congé existant pour cet employé';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER conges_no_overlap
BEFORE INSERT OR UPDATE ON public.conges
FOR EACH ROW EXECUTE FUNCTION public.check_conge_overlap();