
-- 1. Unique CNIC (case-insensitive, ignores NULL)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cnic_unique
  ON public.profiles (lower(cnic))
  WHERE cnic IS NOT NULL;

-- 2. App settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value)
VALUES ('alert_cooldown_minutes', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Cooldown trigger now reads from app_settings
CREATE OR REPLACE FUNCTION public.enforce_alert_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  recent_count integer;
  cooldown_min integer;
BEGIN
  SELECT COALESCE((value)::text::integer, 20)
    INTO cooldown_min
    FROM public.app_settings
    WHERE key = 'alert_cooldown_minutes';

  IF cooldown_min IS NULL THEN cooldown_min := 20; END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.alerts
  WHERE user_id = NEW.user_id
    AND created_at > now() - make_interval(mins => cooldown_min)
    AND status NOT IN ('cancelled', 'rejected', 'solved');

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'You can only create one active alert every % minutes. Discard your active alert or wait before sending another.', cooldown_min;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Update complaints RLS to allow responder_against_user
DROP POLICY IF EXISTS "Users can file complaints" ON public.complaints;
CREATE POLICY "Users can file complaints"
  ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = complainant_id
    AND (
      kind = 'user_against_responder'
      OR (kind = 'admin_against_user' AND public.has_role(auth.uid(), 'admin'))
      OR (kind = 'responder_against_user' AND public.has_role(auth.uid(), 'responder'))
    )
  );
