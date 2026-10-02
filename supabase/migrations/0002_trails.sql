-- Trails ingested from OpenStreetMap (one row per OSM way for now; route
-- stitching and de-duplication come later). Public, read-only to clients.
create table public.trails (
  id bigint generated always as identity primary key,
  osm_id bigint unique not null,
  name text,
  highway text not null,
  sac_scale text,
  surface text,
  region text not null,
  distance_m real not null,
  gain_m real not null,
  loss_m real not null,
  min_ele_m real not null,
  max_ele_m real not null,
  max_grade_pct real not null,
  geom geography(LineString, 4326) not null,
  updated_at timestamptz not null default now()
);

create index trails_geom_idx on public.trails using gist (geom);
create index trails_region_idx on public.trails (region);

alter table public.trails enable row level security;
create policy trails_read on public.trails for select to anon, authenticated using (true);
revoke all on public.trails from anon, authenticated;
grant select on public.trails to anon, authenticated;
