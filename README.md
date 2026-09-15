# LEGOTRACK

Basement Lego city companion for an iPad/tablet: splash screen, simple name+password accounts, real-minifig avatar builder, community standards, and build review — with an admin panel for scanning pieces and managing people.

## Stack

- **Next.js** (App Router) UI + API routes
- **Neon Postgres** for users, avatars, standards, builds, scanned pieces
- **Netlify** for hosting (preferred)

## Local setup

```bash
cp .env.example .env.local
# fill DATABASE_URL + AUTH_SECRET
npm install
npm run dev
```

Default admin (seeded):

- **Name:** `admin`
- **Password:** `legoadmin`

Change this after first login in production.

## Features

1. **Splash** — `LEGOTRACK` title, cycling Lego-style set art, color flashes, white Continue button
2. **Auth** — log in or create account (name + password only)
3. **Avatar builder** — tabs for hair / heads / shirts / pants from real scanned pieces
4. **Community standards** — rules + exceptions (roads, realistic cars/houses, tone)
5. **Build review** — players submit photos; admin approves/rejects
6. **Admin panel** — add users, scan minifigs (auto-split into separate pieces), edit rules, review builds

## Deploy on Netlify

This cloud agent **cannot** open an interactive Netlify OAuth link. Do one of:

### Option A — Personal access token (works here)

1. Open [Netlify personal access tokens](https://app.netlify.com/user/applications#personal-access-tokens)
2. Create a token named `LEGOTRACK agent`
3. Paste it back in chat (or set `NETLIFY_AUTH_TOKEN` in the environment)

Then we can run:

```bash
npx netlify deploy --prod --build
```

Set site env vars in Netlify:

- `DATABASE_URL` — Neon connection string
- `AUTH_SECRET` — long random string

### Option B — Cursor Desktop Netlify MCP

In Cursor Desktop → Settings → MCP → authenticate **Netlify**, then re-run the agent so it can deploy with your account.

### Option C — GitHub ↔ Netlify UI

Connect the `LEGOTRACK` repo in the Netlify dashboard; builds use `netlify.toml` automatically.

## Neon project

Created for this app: **legotrack** (`quiet-salad-00819311`) in org BigHappySmiley (us-east-2).
