
-- Emergency contacts
CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  relation text,
  phone text NOT NULL,
  is_priority boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts read" ON public.emergency_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own contacts insert" ON public.emergency_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contacts update" ON public.emergency_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contacts delete" ON public.emergency_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_emergency_contacts_updated BEFORE UPDATE ON public.emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Geofence zones
CREATE TABLE public.geo_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_km double precision NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geo_zones TO authenticated;
GRANT ALL ON public.geo_zones TO service_role;
ALTER TABLE public.geo_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones read all auth" ON public.geo_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "zones admin insert" ON public.geo_zones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "zones admin update" ON public.geo_zones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "zones admin delete" ON public.geo_zones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_geo_zones_updated BEFORE UPDATE ON public.geo_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alert chat messages
CREATE TABLE public.alert_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.alert_messages TO authenticated;
GRANT ALL ON public.alert_messages TO service_role;
ALTER TABLE public.alert_messages ENABLE ROW LEVEL SECURITY;

-- Only alert owner OR assigned responder may read or post
CREATE POLICY "alert chat read" ON public.alert_messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.alerts a
    LEFT JOIN public.responders r ON r.id = a.assigned_responder_id
    WHERE a.id = alert_messages.alert_id
      AND (a.user_id = auth.uid() OR r.user_id = auth.uid())
  )
);
CREATE POLICY "alert chat insert" ON public.alert_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.alerts a
    LEFT JOIN public.responders r ON r.id = a.assigned_responder_id
    WHERE a.id = alert_messages.alert_id
      AND (a.user_id = auth.uid() OR r.user_id = auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_messages;
