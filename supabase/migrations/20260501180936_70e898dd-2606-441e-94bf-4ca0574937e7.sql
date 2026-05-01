-- Add request fields to responders for user-submitted "become a responder" applications
ALTER TABLE public.responders
  ADD COLUMN IF NOT EXISTS request_message text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Allow a user to dismiss a rejected application so they can re-apply
-- (We allow user to delete their OWN responder row only if status = 'rejected')
DROP POLICY IF EXISTS "Users can dismiss their rejected application" ON public.responders;
CREATE POLICY "Users can dismiss their rejected application"
ON public.responders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'rejected');
