
-- Add tracking columns
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS dispatch_attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_dispatched_at timestamptz NOT NULL DEFAULT now();

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-dispatch function
CREATE OR REPLACE FUNCTION public.auto_redispatch_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
BEGIN
  FOR a IN
    SELECT id, dispatch_attempts
    FROM public.alerts
    WHERE status = 'pending'
      AND last_dispatched_at < now() - INTERVAL '2 minutes'
  LOOP
    IF a.dispatch_attempts >= 9 THEN
      -- Give up after ~20 minutes (1 + 9*2 min)
      UPDATE public.alerts
        SET status = 'rejected',
            updated_at = now()
        WHERE id = a.id;
    ELSE
      -- Clear rejections so responders see it again
      DELETE FROM public.alert_rejections WHERE alert_id = a.id;
      UPDATE public.alerts
        SET dispatch_attempts = dispatch_attempts + 1,
            last_dispatched_at = now(),
            updated_at = now()
        WHERE id = a.id;
    END IF;
  END LOOP;
END;
$$;

-- Schedule every minute (idempotent: unschedule existing first)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-redispatch-alerts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-redispatch-alerts',
  '* * * * *',
  $$ SELECT public.auto_redispatch_alerts(); $$
);
