
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnic text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS role_intent text;

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
  );

  -- Always give base 'user' role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  -- Admin auto-promote
  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Responder application
  IF v_role_intent = 'responder' AND NOT v_is_admin THEN
    INSERT INTO public.responders (user_id, status) VALUES (NEW.id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
