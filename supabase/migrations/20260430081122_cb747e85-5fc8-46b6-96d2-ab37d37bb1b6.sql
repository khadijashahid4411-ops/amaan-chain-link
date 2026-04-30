-- Ensure one profile and one role per user/role
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key ON public.user_roles(user_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS responders_user_id_key ON public.responders(user_id);

-- Add optional evidence metadata requested by users
ALTER TABLE public.evidence
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text;

-- Track responder rejections per alert so declined alerts disappear only for that responder
CREATE TABLE IF NOT EXISTS public.alert_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL,
  responder_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alert_id, responder_id)
);

ALTER TABLE public.alert_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Responders can create their own alert rejections" ON public.alert_rejections;
CREATE POLICY "Responders can create their own alert rejections"
ON public.alert_rejections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.responders r
    WHERE r.id = responder_id
      AND r.user_id = auth.uid()
      AND r.user_id = alert_rejections.user_id
  )
);

DROP POLICY IF EXISTS "Responders and admins can view alert rejections" ON public.alert_rejections;
CREATE POLICY "Responders and admins can view alert rejections"
ON public.alert_rejections
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.responders r
    WHERE r.id = responder_id AND r.user_id = auth.uid()
  )
);

-- Make signup account setup idempotent and resilient to retries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role_intent text;
  v_is_admin boolean;
BEGIN
  v_role_intent := COALESCE(NEW.raw_user_meta_data->>'role_intent', 'user');
  v_is_admin := lower(NEW.email) = 'admin@gmail.com';

  INSERT INTO public.profiles (
    user_id, display_name, phone, cnic, address, area, wallet_address, role_intent
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cnic',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'area',
    NEW.raw_user_meta_data->>'wallet_address',
    v_role_intent
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    cnic = COALESCE(EXCLUDED.cnic, public.profiles.cnic),
    address = COALESCE(EXCLUDED.address, public.profiles.address),
    area = COALESCE(EXCLUDED.area, public.profiles.area),
    wallet_address = COALESCE(EXCLUDED.wallet_address, public.profiles.wallet_address),
    role_intent = COALESCE(EXCLUDED.role_intent, public.profiles.role_intent),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v_role_intent = 'responder' AND NOT v_is_admin THEN
    INSERT INTO public.responders (user_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach the signup setup trigger if it is missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper used by the client to repair older users created while trigger was missing
CREATE OR REPLACE FUNCTION public.ensure_account_setup(
  _display_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _cnic text DEFAULT NULL,
  _address text DEFAULT NULL,
  _area text DEFAULT NULL,
  _wallet_address text DEFAULT NULL,
  _role_intent text DEFAULT 'user'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role_intent text := COALESCE(NULLIF(_role_intent, ''), 'user');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_email := COALESCE((auth.jwt() ->> 'email'), 'user@example.com');

  INSERT INTO public.profiles (
    user_id, display_name, phone, cnic, address, area, wallet_address, role_intent
  ) VALUES (
    v_uid,
    COALESCE(NULLIF(_display_name, ''), split_part(v_email, '@', 1)),
    _phone,
    _cnic,
    _address,
    _area,
    _wallet_address,
    v_role_intent
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    cnic = COALESCE(EXCLUDED.cnic, public.profiles.cnic),
    address = COALESCE(EXCLUDED.address, public.profiles.address),
    area = COALESCE(EXCLUDED.area, public.profiles.area),
    wallet_address = COALESCE(EXCLUDED.wallet_address, public.profiles.wallet_address),
    role_intent = COALESCE(EXCLUDED.role_intent, public.profiles.role_intent),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF lower(v_email) = 'admin@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v_role_intent = 'responder' THEN
    INSERT INTO public.responders (user_id, status)
    VALUES (v_uid, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$function$;

-- Helper to read current user's roles without client-side policy recursion issues
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
$function$;

-- Helper to read current user's profile, including wallet for evidence
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.profiles
  WHERE user_id = auth.uid()
$function$;

-- Change alert cooldown from 1 hour to 20 minutes and ignore discarded/rejected alerts
CREATE OR REPLACE FUNCTION public.enforce_alert_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.alerts
  WHERE user_id = NEW.user_id
    AND created_at > now() - INTERVAL '20 minutes'
    AND status NOT IN ('cancelled', 'rejected', 'solved');

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'You can only create one active alert every 20 minutes. Discard your active alert or wait before sending another.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_alert_cooldown_trigger ON public.alerts;
CREATE TRIGGER enforce_alert_cooldown_trigger
BEFORE INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.enforce_alert_cooldown();

-- Keep updated_at columns fresh
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_responders_updated_at ON public.responders;
CREATE TRIGGER update_responders_updated_at
BEFORE UPDATE ON public.responders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.alerts;
CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_evidence_updated_at ON public.evidence;
CREATE TRIGGER update_evidence_updated_at
BEFORE UPDATE ON public.evidence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();