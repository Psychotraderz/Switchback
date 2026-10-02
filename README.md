# Switchback

A free, donation-funded hiking and backpacking app (US first) that matches
you to trails that fit your body and personality, with consent-based hiking
companions.

## Principles
- **Free core, forever.** Offline maps, navigation, wrong-turn alerts and GPX
  import/export are never paywalled. No ads, no upsell pop-ups.
- **Personal difficulty.** Time and effort estimates are calibrated to *you*,
  not a single hard/moderate label.
- **Honest data.** Every condition report shows its age. Duplicate trails are merged.
- **Offline that can't silently fail.** Offline packs are verified before you lose signal.
- **Consent first.** Nobody is revealed to anyone until they accept an invite
  (see [docs/companion-design.md](docs/companion-design.md)).
- **Private.** No selling location data. One-tap export and delete.

## Stack (all free to build and host)
| Layer | Choice |
|---|---|
| Mobile app | Expo (React Native, TypeScript), `app/` |
| Maps | MapLibre + OpenStreetMap, PMTiles on Cloudflare R2 (no egress fees) |
| Backend | Supabase free tier (Postgres + PostGIS + RLS), `supabase/` |
| Funding | Donations (Open Collective / GitHub Sponsors / Liberapay), public costs |

Only unavoidable cost: Apple's $99/yr developer fee, needed only to publish to
the App Store. Google Play is a one-time ~$25.

## Getting started
```
cd app && npm install
npx expo run:android   # or run:ios on a Mac
```
MapLibre is a native module, so Expo Go won't work: use a development build
(local `expo run:*` is free; EAS Build's free tier also works).
Apply `supabase/migrations/` to a Supabase project (PostGIS is built in).

## Status
Early, pre-release. Working today (all on demo data, not yet real trails):
- Onboarding quiz that builds your hiker profile (saved on device)
- Per-trail fit score, personal time estimate, and sun-exposure chart
- Shade-aware "best time to start" planner with heat and water estimates
- Map screen (MapLibre + OpenStreetMap)
- Trail ingestion pipeline with sun/shade modeling and rest-spot detection (`pipeline/`)
- Consent-based companion schema with row-level security (`supabase/`)

Run tests: `cd app && npm test` and `cd pipeline && npm test`. See [docs/roadmap.md](docs/roadmap.md).

## License
Not yet chosen (AGPL-3.0 is the leading candidate, to keep forks open).
