create index group_daily_cheers_sender_idx
  on public.group_daily_cheers(sender_id);

create index group_daily_cheers_receiver_idx
  on public.group_daily_cheers(receiver_id);
