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
