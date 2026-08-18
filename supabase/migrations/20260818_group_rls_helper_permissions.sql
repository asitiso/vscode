-- RLS policies invoke these helpers as the authenticated caller.
-- Keep them unavailable to anon/PUBLIC, but executable for authenticated policy evaluation.
revoke execute on function public.is_group_member(uuid, uuid) from public, anon;
revoke execute on function public.shares_group_with(uuid, uuid) from public, anon;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.shares_group_with(uuid, uuid) to authenticated;
