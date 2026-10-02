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
cd app && npm install && npx expo start
```
Apply `supabase/migrations/` to a Supabase project (PostGIS is built in).

## Status
Early scaffold. See [docs/roadmap.md](docs/roadmap.md).

## License
Not yet chosen (AGPL-3.0 is the leading candidate, to keep forks open).
