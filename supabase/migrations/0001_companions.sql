-- Switchback: companion feature schema.
-- Rule: nobody is revealed to anyone until the other person has seen their
-- profile and accepted an invite. All access goes through RLS plus the
-- security-definer functions below.

create extension if not exists postgis;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 500),
  pace_band text check (pace_band in ('relaxed', 'steady', 'strong', 'fast')),
  style_tags text[] not null default '{}',
  photo_url text,
  adult_confirmed boolean not null default false,
  -- private columns: never granted to clients (see column grants below)
  open_until timestamptz,
  geo_cell geography(Point, 4326),
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  trail_name text check (char_length(trail_name) <= 100),
  note text not null default '' check (char_length(note) <= 280),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (from_id <> to_id),
  unique (from_id, to_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  reported_id uuid not null references public.profiles on delete cascade,
  reason text not null check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

create table public.matches (
  a_id uuid not null references public.profiles on delete cascade,
  b_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.matches enable row level security;

-- Helper: is there a block in either direction?
create function public.is_blocked(u1 uuid, u2 uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = u1 and blocked_id = u2) or (blocker_id = u2 and blocked_id = u1)
  );
$$;

-- profiles: you can read yourself; the recipient of an invite can read the
-- sender; after acceptance both can read each other. Never across a block.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or (
    not public.is_blocked(auth.uid(), id)
    and exists (
      select 1 from public.invites i
      where (i.to_id = auth.uid() and i.from_id = profiles.id and i.status in ('pending', 'accepted'))
         or (i.from_id = auth.uid() and i.to_id = profiles.id and i.status = 'accepted')
    )
  )
);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid());

-- Column-level grants keep open_until / geo_cell unreadable by clients.
revoke all on public.profiles from authenticated, anon;
grant select (id, handle, display_name, bio, pace_band, style_tags, photo_url, created_at) on public.profiles to authenticated;
grant insert (id, handle, display_name, bio, pace_band, style_tags, photo_url, adult_confirmed) on public.profiles to authenticated;
grant update (handle, display_name, bio, pace_band, style_tags, photo_url, adult_confirmed) on public.profiles to authenticated;

-- invites: recipients read what they received. Senders read through
-- sent_invites() so a decline looks like "pending" and is never revealed.
create policy invites_select_recipient on public.invites for select to authenticated using (to_id = auth.uid());
revoke all on public.invites from authenticated, anon;
grant select on public.invites to authenticated;

-- blocks: manage your own; the blocked person cannot see them.
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
revoke all on public.blocks from anon;
grant select, insert, delete on public.blocks to authenticated;

-- reports: write-only for users.
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
revoke all on public.reports from authenticated, anon;
grant insert on public.reports to authenticated;

-- matches: visible to the two people only.
create policy matches_select on public.matches for select to authenticated
  using (a_id = auth.uid() or b_id = auth.uid());
revoke all on public.matches from authenticated, anon;
grant select on public.matches to authenticated;

-- Go "open to companions" for a window. Location is snapped to a ~5 mile grid
-- on the server; exact coordinates are never stored.
create function public.set_open_to_companions(hours int, lat double precision, lng double precision)
returns void language plpgsql security definer set search_path = public as $$
declare
  step constant double precision := 0.07; -- ~5 miles of latitude
begin
  if hours < 1 or hours > 168 then raise exception 'hours must be 1-168'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and adult_confirmed) then
    raise exception 'adult confirmation required';
  end if;
  update profiles set
    open_until = now() + make_interval(hours => hours),
    geo_cell = st_setsrid(st_makepoint(round(lng / step) * step, round(lat / step) * step), 4326)::geography
  where id = auth.uid();
end $$;

create function public.close_to_companions() returns void
language sql security definer set search_path = public as $$
  update profiles set open_until = null, geo_cell = null where id = auth.uid();
$$;

-- Anonymous cards: first name, pace, style, rough distance. No coordinates,
-- no handle, no photo. You must be open yourself to browse.
create function public.nearby_open_hikers(radius_miles int default 25)
returns table (id uuid, first_name text, pace_band text, style_tags text[], distance_miles int)
language sql stable security definer set search_path = public as $$
  select p.id,
         split_part(p.display_name, ' ', 1),
         p.pace_band,
         p.style_tags,
         (ceil(st_distance(p.geo_cell, me.geo_cell) / 1609.34 / 5) * 5)::int
  from profiles p
  join profiles me on me.id = auth.uid()
  where me.open_until > now() and me.geo_cell is not null
    and p.id <> me.id
    and p.open_until > now() and p.geo_cell is not null
    and st_dwithin(p.geo_cell, me.geo_cell, least(radius_miles, 100) * 1609.34)
    and not public.is_blocked(me.id, p.id)
    and not exists (select 1 from invites i
                    where (i.from_id = me.id and i.to_id = p.id) or (i.from_id = p.id and i.to_id = me.id))
  order by 5, p.created_at
  limit 50;
$$;

create function public.send_invite(target uuid, trail text, msg text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and open_until > now()) then
    raise exception 'turn on companion mode first';
  end if;
  if not exists (select 1 from profiles where id = target and open_until > now()) then
    raise exception 'hiker not available';
  end if;
  if public.is_blocked(auth.uid(), target) then raise exception 'hiker not available'; end if;
  if (select count(*) from invites where from_id = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'daily invite limit reached';
  end if;
  insert into invites (from_id, to_id, trail_name, note) values (auth.uid(), target, trail, coalesce(msg, ''))
    returning id into new_id;
  return new_id;
end $$;

-- Accept or decline. Declines are silent to the sender.
create function public.respond_invite(invite uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  select * into inv from invites where id = invite and to_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'invite not found'; end if;
  if public.is_blocked(inv.from_id, inv.to_id) then raise exception 'invite not found'; end if;
  update invites set status = case when accept then 'accepted' else 'declined' end where id = invite;
  if accept then
    insert into matches (a_id, b_id)
    values (case when inv.from_id < inv.to_id then inv.from_id else inv.to_id end,
            case when inv.from_id < inv.to_id then inv.to_id else inv.from_id end)
    on conflict do nothing;
  end if;
end $$;

create function public.sent_invites()
returns table (id uuid, to_id uuid, trail_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.to_id, i.trail_name,
         case when i.status = 'declined' then 'pending' else i.status end,
         i.created_at
  from invites i
  where i.from_id = auth.uid()
    and (i.status <> 'accepted' or not public.is_blocked(i.from_id, i.to_id));
$$;

revoke all on function public.set_open_to_companions, public.close_to_companions,
  public.nearby_open_hikers, public.send_invite, public.respond_invite, public.sent_invites from public, anon;
grant execute on function public.set_open_to_companions, public.close_to_companions,
  public.nearby_open_hikers, public.send_invite, public.respond_invite, public.sent_invites to authenticated;
