# DevPulse React Frontend

A Vite + React frontend inspired by the visual direction of the provided daily.dev screenshots.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Add your own images

The hero area and dashboard cards intentionally contain placeholders. Replace them with your own images from `public/images/` when ready.

## GitHub explorer

Routes:

- `/github` — repository search with domain, technology and ranking filters
- `/github/:owner/:name` — repository detail

Filter state lives in the URL (`?domain=ai,ml&tech=react&sort=stars&q=agent`),
so a filtered view can be linked or bookmarked.

### Rate limits

Data comes from the public GitHub REST API. Unauthenticated, GitHub allows
60 general requests and 10 searches per hour per IP. Responses are cached
in memory for five minutes, so switching filters back and forth doesn't
spend extra requests, but the detail page alone uses about five requests.

### Production setup (recommended)

A `VITE_...` variable gets compiled straight into the browser bundle, so a
token in `.env` would be visible to anyone who opens dev tools on a
deployed site. To raise the limit safely in production, this project
includes a small serverless proxy that keeps the token server-side:

- `api/github.js` — Vercel serverless function
- `netlify/functions/github.js` — Netlify function

Both forward requests to `https://api.github.com` and attach a token from
the `GITHUB_TOKEN` environment variable (no `VITE_` prefix, so it's never
bundled). Set `GITHUB_TOKEN` in your host's dashboard (Vercel → Project →
Settings → Environment Variables, or the Netlify equivalent) — not in a
committed `.env` file.

The frontend (`src/lib/github.js`) tries `/api/github` first. If that
route isn't running — e.g. you're on a static host with no functions —
it falls back automatically to a direct, unauthenticated browser call, so
the app still works either way.

### Local dev

Plain `npm run dev` works with no setup, using the unauthenticated limit
(or `VITE_GITHUB_TOKEN` in `.env` if you add one — fine for your own
machine, since only you can see your own dev server).

To test the real serverless proxy locally, run it through the platform's
CLI instead of plain Vite:

```bash
npm i -g vercel        # or: npm i -g netlify-cli
vercel dev              # or: netlify dev
```

Either picks up `GITHUB_TOKEN` from `.env` and runs the function alongside
the Vite dev server, so `/api/github` behaves exactly like it will in
production.

### How filtering maps to GitHub

Each checkbox maps to a GitHub topic in `src/data/filters.js`. GitHub treats
several `topic:` qualifiers as AND, so selecting two domains runs two searches
and merges the results, while mixing a domain with a technology narrows to
repositories carrying both topics.

Ranking is applied on top of the search results:

| Option | Query window | Ordering |
| --- | --- | --- |
| Trending | pushed in last 30 days, 200+ stars | stars per day, weighted by push recency |
| Most Stars | 100+ stars | star count |
| Fastest Growing | created in last 18 months, 150+ stars | stars per day |
| Recently Created | created in last 120 days, 20+ stars | creation date |
| Recently Updated | pushed in last 7 days, 100+ stars | push date |

### Deep links on static hosts

`/github/facebook/react` is a client route, so the host has to serve
`index.html` for unknown paths. `public/_redirects` covers Netlify and
`vercel.json` covers Vercel. On other hosts, point the 404 handler at
`index.html`.

## Discover

Route: `/discover` (public — visitors can browse without an account).

"What's happening in tech?" aggregates three sources into one ranked feed,
filtered to developer topics only.

### Sources

All three are free, need no API key, and send CORS headers, so they work
straight from the browser:

| Source | Endpoint | Gives us |
| --- | --- | --- |
| Hacker News | `hn.algolia.com/api/v1/search` | Articles, discussions, Show HN launches |
| DEV Community | `dev.to/api/articles` | Articles, tutorials, cover images |
| GitHub | this project's `/api/github` | Trending repositories |

**Reddit is deliberately not a data source.** Reddit shut down unauthenticated
`.json` endpoints in May 2026 and closed self-service API signups in
November 2025, so there is no free way to read it from a browser. Rather than
fake a feed, the community panel links out to the relevant subreddit and
labels it honestly.

**YouTube is not a live source either** — the Data API requires a key with a
quota. Video cards come from DEV posts tagged `video`. If you want real
YouTube results later, add a key server-side via the same proxy pattern as
GitHub.

### How filtering works

`src/data/discoverFilters.js` maps each developer domain to the vocabulary of
all three sources at once — HN search terms, DEV tag slugs, and GitHub topics.
That single mapping is what keeps the feed developer-only instead of general
tech news. Filter state lives in the URL
(`/discover?domain=ai,web&kind=tool&days=7`).

### "Why is it trending?"

Every card carries a reason computed from real engagement numbers — HN points
versus comment count, DEV reactions, GitHub stars per day since creation.
Nothing is generated or editorialised. A thread with more comments than points,
for example, is labelled as contested rather than popular.

## Projects

Routes:

- `/projects` — browse projects, filter by roadmap role (sidebar) and
  difficulty (tabs), or search
- `/projects/:slug` — a single project: description, requirements,
  constraints, and a Start Working → Submit Solution flow
- `/projects/:slug/solutions` — Community Solutions for that project,
  sorted by rating or recency, with a GitHub link and an optional live
  link per submission

Projects, who's started what, and community solutions all live in a
real, shared **Supabase** (Postgres) database — not `localStorage` —
so this data is the same for every visitor and every deployment, not
just the browser that created it. Every page and component talks to
it only through `src/lib/projectsStore.js`.

**Starting a project and submitting a solution require an account**
(the same customer accounts as `/login`) — both are real Supabase Auth
sessions (see "Accounts" below), so "N people started this" and the
profile stats on `/account` reflect real, verified accounts, not a
free-typed name.

### Supabase setup

The app won't load `/projects` or `/admin` until this is done —
without it, those pages show a "Supabase isn't configured" message
rather than crashing the rest of the site.

1. Create a free project at [supabase.com](https://supabase.com).
2. In your new project, go to **SQL Editor → New query**, paste the
   entire contents of `supabase/schema.sql`, and run it. This creates
   the tables, the `is_admin()` check, the vote function, and all the
   Row Level Security policies.
3. New query again, paste the entire contents of `supabase/seed.sql`,
   and run it. This loads the starter project catalog (the same ideas
   as before, now as real rows instead of bundled JS).
4. Go to **Project Settings → API** and copy the **Project URL** and
   the **`anon` `public`** key (not `service_role` — that one must
   never end up in this app).
5. Put both in a `.env` file locally (copy `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbra...
   ```
6. Restart `npm run dev` so Vite picks up the new env vars.

### Admin workspace

Route: `/admin` (guarded, redirects to `/admin/login`). It is a
**separate area from customer accounts** — its own Supabase Auth
session, and no link to it anywhere in the public nav or footer.

There's no sign-up screen on purpose. To create your first admin:

1. Supabase dashboard → **Authentication → Users → Add user** — set an
   email and password. This is what you'll type into `/admin/login`.
2. Copy that user's **UID** from the same Users list.
3. Supabase dashboard → **Table Editor → `admin_users` → Insert row** —
   set `id` to the UID you copied and `email` to match.

That's it — a Supabase Auth user only counts as an admin here once
they have a row in `admin_users`. To add a second admin later, repeat
those three steps for their account. There's no path from the app's
own UI to grant admin — it's deliberately dashboard-only, so a bug in
the app can't accidentally hand out admin access.

### Deploying (Vercel)

1. Push this repo to GitHub, then **Import Project** on
   [vercel.com](https://vercel.com) from that repo. Vercel auto-detects
   the Vite build.
2. Project → **Settings → Environment Variables**, add for
   **Production** (and Preview, if you use it):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GITHUB_TOKEN` (optional, for the GitHub explorer — see above)
3. Deploy. `vercel.json` already rewrites every non-`/api` path to
   `index.html`, so client-side routes (`/projects`, `/admin/login`,
   etc.) work correctly on the deployed site, not just in dev.
4. Visit `your-project.vercel.app/admin/login` and sign in with the
   admin account you created above — nothing in the public nav links
   there, so this URL is the only way in.

### Hardening further

One thing left, worth doing before this handles a real audience:

- **No solution moderation UI yet** — the schema already lets an admin
  delete a solution (`solutions_admin_delete` policy), it's just not
  wired into `AdminDashboard.jsx` yet.

The identity gap that used to be listed here — customer accounts not
being real Supabase sessions, so participation/solutions couldn't be
tied to a verified account — is closed: see "Accounts" below for how
sign-in now works.

## Accounts

Routes: `/login` (sign in / sign up), `/account` (settings).

`/github` and `/github/:owner/:name` are wrapped in `ProtectedRoute`, so
clicking GitHub in the navbar while signed out redirects to `/login` and
returns you to where you were heading after signing in. The navbar shows a
small lock next to GitHub when you're signed out.

The profile menu (click your avatar) has account settings, update email,
change password, log out, and delete account. Changing your email or password,
and deleting your account, each require your current password.

Accounts use the **same Supabase project** as the Projects feature — see
"Supabase setup" above. If you've already run `supabase/schema.sql` for
Projects, there's nothing extra to create for accounts to work; Supabase
Auth is on by default for every project.

### How sign-in actually works now

Signing in gets you a real session Supabase itself issued and verifies on
every request — not a flag stored in `localStorage` that devtools could
edit to fake a login. Every write a signed-in visitor can make (starting a
project, submitting a solution) is checked **server-side** against that
session via the Row Level Security policies in `supabase/schema.sql`
(`user_id = auth.uid()`), so there's no way to record either as anyone but
the real signed-in account.

A couple of behaviors come from Supabase itself, worth knowing before you
test sign-up:

- **Email confirmation.** By default, a new account can't sign in until it
  clicks a confirmation link Supabase emails it. The sign-up form shows a
  "check your email" screen when this happens. For quick local testing you
  can turn it off: Supabase dashboard → **Authentication → Providers →
  Email → uncheck "Confirm email"**. Leave it on for a real deployment.
- **Changing your email** sends a confirmation link to the *new* address;
  the change only takes effect once that's clicked, so `/account` shows a
  "check your new address" message instead of "Email updated" in that case.

### Deleting an account

Deleting a Supabase Auth user requires the **service_role** key, which must
never reach the browser — so this one action goes through a small Edge
Function (`supabase/functions/delete-account`) instead of a direct client
call. Deploy it once (needs the
[Supabase CLI](https://supabase.com/docs/guides/cli)):

```
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy delete-account
```

No secrets to configure — Supabase automatically provides the function with
its own project URL and both keys as environment variables. Until this is
deployed, clicking "Delete account" in `/account` fails with a clear error
message rather than doing nothing silently.

### Security — read before deploying

- Passwords are handled entirely by Supabase Auth — this app never sees or
  stores one.
- Every write tied to an identity (starting a project, submitting a
  solution) is enforced by Postgres Row Level Security, not just hidden in
  the UI — see `supabase/schema.sql`.
- `admin_users` is separate from regular accounts and has no public
  read/write access at all — see "Admin workspace" above for how it's
  managed.
- What's *not* covered here: rate limiting sign-ups, CAPTCHA on the login
  form, and email deliverability (confirmation/reset emails use Supabase's
  built-in mailer, which is fine for testing but rate-limited — see
  Supabase's docs on configuring a custom SMTP provider before real
  traffic).
