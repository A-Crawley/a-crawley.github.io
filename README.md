# a-crawley.com

Personal site, built with React, TypeScript, Vite, MUI and Supabase. Live at [a-crawley.com](https://a-crawley.com).

## Branches

- `react`: source. All changes go through pull requests into this branch.
- `gh-pages`: built output, published by GitHub Pages. Never edit by hand; it is overwritten on every deploy.
- `master`: older static site, kept for reference.

## Local development

Requires Node 22 or newer.

```
npm ci
npm run dev
```

The app reads project data from Supabase. Create `.env.local` with:

```
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_KEY=...
```

(`VITE_`-prefixed names also work.)

## Scripts

- `npm run dev`: dev server
- `npm test`: run tests once (Vitest)
- `npm run typecheck`: TypeScript type check
- `npm run lint`: ESLint
- `npm run format`: format everything with Prettier (`npm run format:check` only checks)
- `npm run build`: typecheck, then production build into `build/`
- `npm run preview`: serve the production build locally

## CI and deployment

- Pull requests into `react` run a Prettier check, typecheck, lint, tests and a build (`.github/workflows/ci.yml`). The `ci` check must pass before merging.
- Pushes to `react` build the site and publish it to `gh-pages` (`.github/workflows/deploy.yml`). `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` are repository secrets.
- Dependabot opens weekly minor and patch updates. These, and any PR labelled `automerge`, are squash-merged automatically once `ci` passes (`.github/workflows/automerge.yml`).
