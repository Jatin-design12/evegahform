# eVEGAH Form

## Dev

- Install deps: `npm i`
- Start: `npm run dev`

## Local Postgres (drafts table)

If you want the `rider_drafts` table in a **local Postgres** database, you can use the included Docker Compose setup.

1. Start Postgres:

	`docker compose -f docker-compose.postgres.yml up -d`

2. The schema is automatically applied on first boot from:

	`db/init/001_rider_drafts.sql`

Notes:

- This only creates the table locally.
- The frontend currently uses the Supabase client (`src/config/supabase.js`) to read/write drafts. A browser app cannot connect to Postgres directly; it needs an HTTP API (or Supabase/PostgREST). If you want the app to use local Postgres end-to-end, tell me and I’ll add a small local API server.
