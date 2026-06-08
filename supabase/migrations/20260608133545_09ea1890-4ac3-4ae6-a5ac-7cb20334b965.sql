
-- Add monthly retention configuration on workers
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS monthly_retention numeric NOT NULL DEFAULT 0;

-- Change acompte_transactions type values: acompte | dette | reglement
ALTER TABLE public.acompte_transactions DROP CONSTRAINT IF EXISTS acompte_transactions_type_check;
UPDATE public.acompte_transactions SET type = 'acompte' WHERE type = 'add';
UPDATE public.acompte_transactions SET type = 'reglement' WHERE type = 'subtract';
ALTER TABLE public.acompte_transactions
  ADD CONSTRAINT acompte_transactions_type_check CHECK (type = ANY (ARRAY['acompte'::text, 'dette'::text, 'reglement'::text]));

-- previous_balance/new_balance are no longer meaningful with 3 types; make nullable to avoid insert friction
ALTER TABLE public.acompte_transactions ALTER COLUMN previous_balance DROP NOT NULL;
ALTER TABLE public.acompte_transactions ALTER COLUMN new_balance DROP NOT NULL;
