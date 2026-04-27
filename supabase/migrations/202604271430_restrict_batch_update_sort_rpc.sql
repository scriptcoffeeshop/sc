-- Restrict high-privilege sorting RPC to Edge Functions using service_role.
-- The function remains SECURITY DEFINER for service_role-backed admin flows,
-- but it must not be callable through PostgREST by anon/authenticated clients.

REVOKE EXECUTE ON FUNCTION public.batch_update_sort(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.batch_update_sort(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.batch_update_sort(text, jsonb) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.batch_update_sort(text, jsonb) TO service_role;
