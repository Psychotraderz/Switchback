-- Read APIs for the app. Trails near a point (no geometry in list results) and
-- one trail's line as GeoJSON for drawing on the map.
create function public.trails_near(lng double precision, lat double precision, radius_m integer default 25000, max_rows integer default 100)
returns table (
  id bigint, name text, region text,
  distance_m real, gain_m real, max_grade_pct real,
  sun_exposure_pct real, sun_profile jsonb,
  away_m integer
)
language sql stable set search_path = public as $$
  select t.id, t.name, t.region, t.distance_m, t.gain_m, t.max_grade_pct, t.sun_exposure_pct, t.sun_profile,
         st_distance(t.geom, st_setsrid(st_makepoint(lng, lat), 4326)::geography)::integer
  from trails t
  where st_dwithin(t.geom, st_setsrid(st_makepoint(lng, lat), 4326)::geography, least(radius_m, 100000))
  order by 9
  limit least(max_rows, 200);
$$;

create function public.trail_geojson(trail bigint) returns json
language sql stable set search_path = public as $$
  select st_asgeojson(geom::geometry)::json from trails where id = trail;
$$;

grant execute on function public.trails_near, public.trail_geojson to anon, authenticated;
