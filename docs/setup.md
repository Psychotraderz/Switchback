# Setup: connecting real data

1. **Supabase (free).** Create a project at supabase.com. Enable the PostGIS
   extension, then run `supabase/migrations/*.sql` in order (SQL editor or `supabase db push`).
2. **App config.** In `app/`, copy `.env.example` to `.env` and fill in the project URL and anon key.
   Without them the app shows demo trails.
3. **Load trails.** From `pipeline/`, run `node src/ingest.ts red-rock` (needs internet access to
   overpass-api.de and api.open-meteo.com), then run the generated `out/red-rock.sql` and
   `out/red-rock.rest.sql` in the Supabase SQL editor.
4. **Run the app.** `cd app && npm install && npx expo run:android` (or `run:ios` on a Mac).
   MapLibre is native, so Expo Go is not supported.
