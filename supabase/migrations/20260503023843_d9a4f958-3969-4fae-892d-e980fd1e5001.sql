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

REVOKE ALL ON FUNCTION public.get_my_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;