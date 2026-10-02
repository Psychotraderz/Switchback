-- Sun exposure per trail and rest/cooling spots.
-- sun_exposure_pct: mean summer exposure 11:00-15:00 (0 = fully shaded, 100 = full sun).
-- sun_profile: {"summer"|"equinox"|"winter": [pct for local hours 7..18]}.
alter table public.trails
  add column sun_exposure_pct real check (sun_exposure_pct between 0 and 100),
  add column sun_profile jsonb;

create table public.rest_spots (
  id bigint generated always as identity primary key,
  key text unique not null,           -- 'osm:<id>' or 'derived:<trail_osm_id>:<n>'
  osm_id bigint,
  trail_osm_id bigint,                -- set for derived spots
  kind text not null check (kind in ('spring', 'water', 'shelter', 'picnic', 'cave', 'shade')),
  name text,
  source text not null check (source in ('osm', 'derived')),
  has_water boolean not null default false,
  exposure_pct real,                  -- derived shade spots: mean afternoon sun exposure
  geom geography(Point, 4326) not null,
  created_at timestamptz not null default now()
);

create index rest_spots_geom_idx on public.rest_spots using gist (geom);
create index rest_spots_trail_idx on public.rest_spots (trail_osm_id);

alter table public.rest_spots enable row level security;
create policy rest_spots_read on public.rest_spots for select to anon, authenticated using (true);
revoke all on public.rest_spots from anon, authenticated;
grant select on public.rest_spots to anon, authenticated;
