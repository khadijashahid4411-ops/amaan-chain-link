
-- Complaint status enum
DO $$ BEGIN
  CREATE TYPE public.complaint_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.complaint_kind AS ENUM ('user_against_responder', 'admin_against_user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.complaint_kind NOT NULL,
  complainant_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  target_responder_id uuid,
  alert_id uuid,
  category text NOT NULL,
  message text NOT NULL,
  status public.complaint_status NOT NULL DEFAULT 'open',
  admin_notes text,
  action_taken text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_target_user ON public.complaints(target_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON public.complaints(complainant_id);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Complainants can view their own complaints
CREATE POLICY "Complainants can view their own complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (auth.uid() = complainant_id OR public.has_role(auth.uid(), 'admin'));

-- Users can file complaints about responders (must be the complainant)
CREATE POLICY "Users can file complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = complainant_id
  AND (
    (kind = 'user_against_responder')
    OR (kind = 'admin_against_user' AND public.has_role(auth.uid(), 'admin'))
  )
);

-- Admins can update complaints
CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_complaints_updated_at ON public.complaints;
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin RPC to delete a user (admins only). Removes profile, roles, responder, complaints filed by them.
-- The actual auth.users row removal must be done by an edge function with the service role,
-- but cleaning public schema rows here is safe and allowed.
CREATE OR REPLACE FUNCTION public.admin_purge_user_data(_target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can purge user data';
  END IF;

  IF _target_user = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot purge their own account here';
  END IF;

  DELETE FROM public.alert_rejections WHERE user_id = _target_user;
  DELETE FROM public.evidence WHERE uploaded_by = _target_user;
  DELETE FROM public.responders WHERE user_id = _target_user;
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  DELETE FROM public.complaints WHERE complainant_id = _target_user OR target_user_id = _target_user;
  -- Soft-cancel any active alerts owned by this user
  UPDATE public.alerts SET status = 'cancelled' WHERE user_id = _target_user AND status NOT IN ('solved','rejected','cancelled');
  DELETE FROM public.profiles WHERE user_id = _target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_purge_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_data(uuid) TO authenticated;
