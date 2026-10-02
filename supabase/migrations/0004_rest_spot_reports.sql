-- Hikers confirm or dispute rest spots. One vote per user per spot (re-voting
-- replaces it and refreshes its age). Clients never read raw votes; they read
-- rest_spot_confidence, which weights votes by recency (half-life 180 days).
create table public.rest_spot_reports (
  spot_id bigint not null references public.rest_spots on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  verdict text not null check (verdict in ('confirm', 'dispute')),
  note text not null default '' check (char_length(note) <= 280),
  reported_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

alter table public.rest_spot_reports enable row level security;
revoke all on public.rest_spot_reports from authenticated, anon;
-- Users can see only their own votes (to show "you confirmed this").
create policy reports_own_select on public.rest_spot_reports for select to authenticated using (user_id = auth.uid());
grant select on public.rest_spot_reports to authenticated;

create function public.report_rest_spot(spot bigint, verdict text, msg text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  insert into rest_spot_reports (spot_id, user_id, verdict, note, reported_at)
  values (spot, auth.uid(), verdict, coalesce(msg, ''), now())
  on conflict (spot_id, user_id) do update
    set verdict = excluded.verdict, note = excluded.note, reported_at = now();
end $$;

revoke all on function public.report_rest_spot from public, anon;
grant execute on function public.report_rest_spot to authenticated;

-- Aggregate view: recency-weighted counts, the age of the newest report, and a
-- status the app can show with a "last confirmed N days ago" label.
create view public.rest_spot_confidence as
select
  s.id as spot_id,
  coalesce(sum(case when r.verdict = 'confirm' then power(0.5, extract(epoch from now() - r.reported_at) / 86400 / 180) end), 0) as confirm_weight,
  coalesce(sum(case when r.verdict = 'dispute' then power(0.5, extract(epoch from now() - r.reported_at) / 86400 / 180) end), 0) as dispute_weight,
  count(r.user_id) as report_count,
  max(r.reported_at) as last_reported_at,
  case
    when count(r.user_id) = 0 then 'unverified'
    when coalesce(sum(case when r.verdict = 'dispute' then power(0.5, extract(epoch from now() - r.reported_at) / 86400 / 180) end), 0)
       > coalesce(sum(case when r.verdict = 'confirm' then power(0.5, extract(epoch from now() - r.reported_at) / 86400 / 180) end), 0) then 'disputed'
    else 'confirmed'
  end as status
from public.rest_spots s
left join public.rest_spot_reports r on r.spot_id = s.id
group by s.id;

grant select on public.rest_spot_confidence to anon, authenticated;
