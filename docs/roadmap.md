# Roadmap

1. **MVP** – trail search and map, offline packs with verification, GPS tracking, GPX import/export.
2. **Fit engine** – onboarding quiz (fitness and personality), personal difficulty and time estimates, fit scores.
3. **Community** – timestamped conditions, trail de-duplication, crowd signals.
4. **Companions** – opt-in discovery, invites, matches, chat, safety check-ins
   (schema in `supabase/migrations/0001_companions.sql`; design in `companion-design.md`).
5. **Backpacking** – multi-day planner, water and camp data, overdue alerts.

## Data pipeline (in progress)
- First region: Southern California plus southern Nevada desert (Red Rock, Spring
  Mountains, Valley of Fire, Death Valley, Joshua Tree, San Jacinto, San Gorgonio,
  Anza-Borrego). Bounding boxes in `pipeline/regions.json` are approximate.
- `pipeline/` pulls OSM paths via Overpass, samples elevation, computes distance,
  gain/loss and steepest grade, and emits idempotent SQL for `public.trails`.
  Run `npm test` in `pipeline/` (8 tests on a synthetic fixture).
- Not yet validated against real data: the sandbox could not reach Overpass or
  an elevation API. Run `node src/ingest.ts red-rock` locally to try it.
- Next: stitch ways into whole routes, de-duplicate, then desert-specific
  signals (heat exposure, water sources, flash-flood terrain) for personal difficulty.

## Sun/shade and rest spots
- `trails.sun_exposure_pct`: mean summer exposure 11:00-15:00 (0 = shaded, 100 = full sun).
  `trails.sun_profile`: exposure by local hour 7-18 for summer solstice, equinox
  and winter solstice, so the app can show "shadiest start time" for any season.
- Model: sun position (NOAA approximation) plus terrain-shadow ray marching over a DEM,
  optionally combined with a tree-canopy sampler (none wired yet; NLCD tree canopy is the candidate).
- `rest_spots`: OSM springs, drinking water, shelters, picnic sites and cave entrances,
  plus derived shaded stretches (afternoon exposure <= 30%, grade <= 10%, >= 40 m).
  `has_water` marks cooling spots.
- Limits: a ~90-100 m DEM misses canyon walls and overhangs, so shade in narrow slot
  canyons is under-reported until we use 10 m 3DEP data. Derived spots are model
  estimates, not field-verified.
- Next: let hikers confirm or dispute a rest spot (with report age shown), and feed
  exposure, water and heat into the personal difficulty score and trip planner
  ("start at 6:10 to be in shade by 10:30").
