-- Trigger function: ensure responder role can only be granted when an approved responders row exists
CREATE OR REPLACE FUNCTION public.enforce_responder_role_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'responder'::app_role THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.responders r
      WHERE r.user_id = NEW.user_id
        AND r.status = 'approved'::responder_status
    ) THEN
      RAISE EXCEPTION 'Cannot grant responder role: user % has no approved responder application', NEW.user_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_responder_role_approval ON public.user_roles;
CREATE TRIGGER trg_enforce_responder_role_approval
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_responder_role_approval();

-- When a responders row transitions to approved, auto-insert the responder role.
-- When it transitions away from approved (rejected/suspended), remove the role.
CREATE OR REPLACE FUNCTION public.sync_responder_role_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved'::responder_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'responder'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved'::responder_status
     AND NEW.status <> 'approved'::responder_status THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'responder'::app_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_responder_role ON public.responders;
CREATE TRIGGER trg_sync_responder_role
AFTER UPDATE ON public.responders
FOR EACH ROW EXECUTE FUNCTION public.sync_responder_role_on_status_change();

-- Tighten user_roles policy: only admins can manage roles AND responder role still passes the trigger guard.
-- (The existing 'Admins can manage roles' policy is sufficient; the trigger adds the integrity layer.)