-- Migration: Add registrations_count to price_batches and keep it synced

-- 1. Add the column
ALTER TABLE public.price_batches ADD COLUMN IF NOT EXISTS registrations_count INT DEFAULT 0;

-- 2. Backfill existing counts (so previous data is accurate)
UPDATE public.price_batches pb
SET registrations_count = (
    SELECT count(*) 
    FROM public.registrations r 
    WHERE r.batch_id = pb.id
);

-- 3. Trigger function to keep registrations_count synced automatically
CREATE OR REPLACE FUNCTION sync_batch_registrations_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.batch_id IS NOT NULL THEN
            UPDATE public.price_batches 
            SET registrations_count = registrations_count + 1 
            WHERE id = NEW.batch_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.batch_id IS NOT NULL THEN
            UPDATE public.price_batches 
            SET registrations_count = registrations_count - 1 
            WHERE id = OLD.batch_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
            IF OLD.batch_id IS NOT NULL THEN
                UPDATE public.price_batches 
                SET registrations_count = registrations_count - 1 
                WHERE id = OLD.batch_id;
            END IF;
            IF NEW.batch_id IS NOT NULL THEN
                UPDATE public.price_batches 
                SET registrations_count = registrations_count + 1 
                WHERE id = NEW.batch_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL; -- For AFTER triggers, returning NULL is fine
END;
$$ LANGUAGE plpgsql;

-- 4. Create the Trigger
DROP TRIGGER IF EXISTS trigger_sync_batch_count ON public.registrations;

CREATE TRIGGER trigger_sync_batch_count
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION sync_batch_registrations_count();
