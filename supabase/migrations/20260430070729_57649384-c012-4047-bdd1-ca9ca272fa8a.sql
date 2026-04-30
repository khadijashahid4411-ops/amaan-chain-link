-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('user', 'responder', 'admin');
CREATE TYPE public.responder_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.alert_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.alert_status AS ENUM ('pending', 'accepted', 'in_progress', 'solved', 'rejected', 'cancelled');
CREATE TYPE public.evidence_status AS ENUM ('pending', 'verified', 'failed');

-- =========================================================
-- TIMESTAMP HELPER
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  wallet_address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER ROLES (separate table — never on profiles)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- RESPONDERS
-- =========================================================
CREATE TABLE public.responders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.responder_status NOT NULL DEFAULT 'pending',
  specialty TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  total_responses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.responders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_responders_updated BEFORE UPDATE ON public.responders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ALERTS
-- =========================================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  priority public.alert_priority NOT NULL DEFAULT 'medium',
  status public.alert_status NOT NULL DEFAULT 'pending',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  assigned_responder_id UUID REFERENCES public.responders(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  user_marked_solved BOOLEAN NOT NULL DEFAULT false,
  responder_marked_solved BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  rating_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_user ON public.alerts(user_id);
CREATE INDEX idx_alerts_assigned ON public.alerts(assigned_responder_id);
CREATE TRIGGER trg_alerts_updated BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 1-HOUR COOLDOWN TRIGGER (validation, not CHECK constraint)
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_alert_cooldown()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.alerts
  WHERE user_id = NEW.user_id
    AND created_at > now() - INTERVAL '1 hour'
    AND status NOT IN ('cancelled', 'rejected');
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'You can only create one alert per hour. Please wait before sending another.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_alerts_cooldown BEFORE INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_alert_cooldown();

-- =========================================================
-- EVIDENCE
-- =========================================================
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_role public.app_role NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  ipfs_cid TEXT NOT NULL,
  ipfs_url TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  wallet_address TEXT,
  tx_hash TEXT,
  chain_id INTEGER,
  status public.evidence_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_evidence_alert ON public.evidence(alert_id);
CREATE INDEX idx_evidence_hash ON public.evidence(file_hash);
CREATE TRIGGER trg_evidence_updated BEFORE UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Profiles
CREATE POLICY "Profiles are viewable by signed-in users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User Roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Responders
CREATE POLICY "Approved responders are visible to signed-in users"
  ON public.responders FOR SELECT TO authenticated
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can request to become a responder"
  ON public.responders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Responders can update their own row"
  ON public.responders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete responders"
  ON public.responders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Alerts
CREATE POLICY "Users see their own alerts; responders see active; admins see all"
  ON public.alerts FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'responder')
      AND EXISTS (
        SELECT 1 FROM public.responders r
        WHERE r.user_id = auth.uid() AND r.status = 'approved'
      )
    )
  );
CREATE POLICY "Users can create their own alerts"
  ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner, assigned responder, or admin can update alert"
  ON public.alerts FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.responders r
      WHERE r.id = alerts.assigned_responder_id AND r.user_id = auth.uid()
    )
    OR (
      alerts.status = 'pending'
      AND public.has_role(auth.uid(), 'responder')
      AND EXISTS (SELECT 1 FROM public.responders r WHERE r.user_id = auth.uid() AND r.status = 'approved')
    )
  );

-- Evidence
CREATE POLICY "Evidence visible to involved parties + admins"
  ON public.evidence FOR SELECT TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.alerts a
      LEFT JOIN public.responders r ON r.id = a.assigned_responder_id
      WHERE a.id = evidence.alert_id
        AND (a.user_id = auth.uid() OR r.user_id = auth.uid())
    )
  );
CREATE POLICY "Involved parties can upload evidence"
  ON public.evidence FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.alerts a
      LEFT JOIN public.responders r ON r.id = a.assigned_responder_id
      WHERE a.id = alert_id
        AND (a.user_id = auth.uid() OR r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Uploader or admin can update evidence"
  ON public.evidence FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- REALTIME
-- =========================================================
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.responders REPLICA IDENTITY FULL;
ALTER TABLE public.evidence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence;