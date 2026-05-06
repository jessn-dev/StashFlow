-- Add completed_at column to loans table
-- -----------------------------------------------------------------------------

ALTER TABLE public.loans 
ADD COLUMN completed_at TIMESTAMPTZ;

-- Update existing completed loans to have a completed_at date (fallback to updated_at or now)
UPDATE public.loans 
SET completed_at = created_at 
WHERE status = 'completed' AND completed_at IS NULL;
