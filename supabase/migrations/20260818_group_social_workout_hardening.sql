-- Remove write-like default grants and PUBLIC function execution from the group subsystem.

revoke truncate on public.groups from authenticated, anon;
revoke truncate on public.group_members from authenticated, anon;
revoke truncate on public.workout_sessions from authenticated, anon;
revoke truncate on public.group_activity_daily from authenticated, anon;
revoke insert, update, delete, truncate on public.groups from anon;
revoke insert, update, delete, truncate on public.group_members from anon;
revoke insert, update, delete, truncate on public.workout_sessions from anon;
revoke insert, update, delete, truncate on public.group_activity_daily from anon;

revoke execute on function public.upsert_group_profile(text) from public, anon;
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group_by_invite_code(text) from public, anon;
revoke execute on function public.leave_group(uuid) from public, anon;
revoke execute on function public.remove_group_member(uuid, uuid) from public, anon;
revoke execute on function public.start_workout_session() from public, anon;
revoke execute on function public.heartbeat_workout_session(uuid) from public, anon;
revoke execute on function public.end_workout_session(uuid, date) from public, anon;

-- Helpers are internal implementation details; callers should not invoke them directly.
revoke execute on function public.is_group_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.shares_group_with(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.generate_group_invite_code() from public, anon, authenticated;

grant execute on function public.upsert_group_profile(text) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.start_workout_session() to authenticated;
grant execute on function public.heartbeat_workout_session(uuid) to authenticated;
grant execute on function public.end_workout_session(uuid, date) to authenticated;
