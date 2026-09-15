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

## Live site

**https://legotrack-449.netlify.app**

Production deploys go from **`main`**. Redeploy:

```bash
git checkout main && git pull
npx netlify deploy --prod --build
```

Netlify env vars already set: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_NAME`.

## Neon project

Created for this app: **legotrack** (`quiet-salad-00819311`) in org BigHappySmiley (us-east-2).
