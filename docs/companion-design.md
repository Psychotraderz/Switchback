# Switchback: Companion Feature Design (draft)

## Rule
Nobody is shown to anyone until they have seen the other person's profile and accepted an invite. Discovery is opt-in and off by default.

## Flow
1. User turns on "Open to companions" and picks a trail or area plus a date window. It auto-expires after the window.
2. Nearby open users appear only as an anonymous card: first name or handle, fit-score overlap, pace band, hike style. Location is fuzzed to a ~5 mile cell. The server never returns exact coordinates.
3. A sends an invite with a short note. A's full profile is sent to B only when the invite is created.
4. B reviews A's profile and can accept, decline or block. Decline is silent, so A never learns who declined.
5. On accept, both are revealed to each other. They get in-app chat, a suggested public trailhead meetup, and an optional live-share and overdue check-in.
6. If B never accepts, B is never shown to A.

## Safety defaults
- Mutual block and report, with rate limits on invites.
- Verified phone or email required. Optional photo verification badge.
- No exact home location, ever. Pickup point is always a public trailhead.
- Chat is deleted 30 days after the hike. The user can delete their account and data in one tap.
- 18+ only. Show safety tips before the first meetup.

## Data model (Supabase / Postgres + PostGIS, RLS on every table)
- `profiles(id, handle, bio, pace_band, style_tags, photo_url, open_until, geo_cell)`
- `invites(id, from_id, to_id, trail_id, note, status, created_at)`
- `blocks(blocker_id, blocked_id)`
- `matches(id, a_id, b_id, created_at)`

Row-level security: a user can read another profile only if `open_until > now()` and not blocked (anonymous card view), or an invite or match exists between the two (full profile).
Nearby search is a server function (RPC) returning the anonymous card view only.

## Open question
Which side is shown first? This draft shows B a full profile of A, and A only sees B after B accepts. Confirm this matches what you meant.
