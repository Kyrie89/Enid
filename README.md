# Enid Resource Network

A directory of Enid, OK recovery, housing, legal, medical, and community
resources — built for staff to search, filter, and maintain referrals, with a
simplified client-facing view for the people they're helping.

This is the Supabase-backed rebuild of the original single-user artifact: real
accounts, Row Level Security instead of a client-side toggle, and a Postgres
database instead of one JSON blob that the last save wins on.

## 1. Create the Supabase project

1. [supabase.com](https://supabase.com) → New project → note the **Project
   URL** and **anon public key** (Settings → API). Both are safe to expose
   client-side; security is enforced by Row Level Security, not by hiding the
   key.
2. Open the SQL Editor and run everything in [`supabase/schema.sql`](supabase/schema.sql).
   It creates the tables, an `is_editor()` helper, and the RLS policies that
   gate writes on actual editor approval (see the note at the top of that file
   for why this differs slightly from a naive "any logged-in user can write"
   setup).

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Settings → API.

## 3. Install and run locally

```bash
npm install
npm run dev
```

## 4. Load the seed data (once)

The `SEED` array in `src/seedData.js` has the resources from the original
artifact. To load it into a fresh project:

1. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → the
   **service_role** secret, not the anon key) to `.env`. This key bypasses
   RLS — it's only ever used by this script, run locally, never shipped to
   the browser.
2. Run:
   ```bash
   npm run migrate-seed
   ```
   Safe to re-run — resources upsert on `id`, and schedule/connections are
   cleared per-resource before reinserting so nothing duplicates.

## 5. Auth for staff — approving editors

1. Supabase dashboard → Authentication → Providers → confirm **Email** is
   enabled (the app uses magic-link sign-in, no passwords).
2. A new staff member signs in once from the app's "Sign in" box in Staff
   view. That creates their `auth.users` row.
3. To approve them as an editor (able to add/edit/close/delete resources),
   insert a row from the SQL editor:
   ```sql
   insert into editors (id, display_name)
   values ('paste-their-auth-user-id-here', 'Nikki H.');
   ```
   Find their user id under Authentication → Users. This manual step is the
   actual access-control boundary — nobody can grant themselves editor status
   from the client.

Until approved, a signed-in user can browse (including seeing that they're
pending approval) but every write is rejected by RLS, not just hidden by the
UI.

## 6. Deploy

1. Push this repo to GitHub.
2. Vercel or Netlify → import the repo → set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` as environment variables.
3. Deploy. Free tier on both sides comfortably covers a directory this size.

## 7. Don't skip this part

- **Free Supabase projects pause after 7 days with no traffic.** A free
  uptime pinger (UptimeRobot, cron-job.org) hitting the site every few days
  prevents this until real usage makes it a non-issue.
- **No automatic backups on the free tier.** Once real people are entering
  real data, export the `resources` table to CSV on some regular cadence
  (the app's own CSV export button works for this) until/unless you're on a
  paid tier with backups.
- **Approving editors is manual by design** — don't automate it away without
  thinking through who that lets in.

## Project layout

```
src/
  App.jsx              top-level state, data loading, and mutations
  supabaseClient.js     Supabase client (anon key only)
  seedData.js           one-time seed data (see migrate-seed.mjs)
  styles.js             the S style object used throughout
  lib/
    taxonomy.js         category/issue/barrier constants
    utils.js            fuzzy search, duplicate detection, verification age
  components/
    AuthBar.jsx          magic-link sign-in / sign-out, editor-pending notice
    DetailView.jsx        resource detail pane
    EditForm.jsx          add/edit form
    ScheduleEditor.jsx     weekly schedule sub-editor used by EditForm
    NetworkView.jsx        referral network graph
    InsightsPanel.jsx      stale/isolated resource stats, search misses
    shared.jsx             small presentational pieces (chips, fields, rows)
supabase/
  schema.sql            tables + RLS, run once in the SQL editor
scripts/
  migrate-seed.mjs       one-time seed loader (service-role key, run locally)
```
