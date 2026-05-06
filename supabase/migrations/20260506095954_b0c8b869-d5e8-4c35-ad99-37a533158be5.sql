
ALTER TABLE public.evidence ALTER COLUMN alert_id DROP NOT NULL;

DROP POLICY IF EXISTS "Involved parties can upload evidence" ON public.evidence;
CREATE POLICY "Involved parties or self can upload evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    alert_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.alerts a
      LEFT JOIN public.responders r ON r.id = a.assigned_responder_id
      WHERE a.id = evidence.alert_id
        AND (a.user_id = auth.uid() OR r.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
);

DROP POLICY IF EXISTS "Evidence visible to involved parties + admins" ON public.evidence;
CREATE POLICY "Evidence visible to involved parties + admins"
ON public.evidence
FOR SELECT
TO authenticated
USING (
  auth.uid() = uploaded_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    alert_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.alerts a
      LEFT JOIN public.responders r ON r.id = a.assigned_responder_id
      WHERE a.id = evidence.alert_id
        AND (a.user_id = auth.uid() OR r.user_id = auth.uid())
    )
  )
);
