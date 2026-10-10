# CLAUDE.md

Guidance for Claude (and other coding agents) working in this repo. Humans: see `README.md` for setup.

## Project

Personal site for a-crawley.com. A single-page React app that lists projects loaded from Supabase.
It is also the planned home for an incremental (idle) game.

Stack: React 19, TypeScript (strict), Vite, MUI 9 + Emotion, Supabase JS 2, Vitest + Testing Library,
ESLint 9 (flat config), Prettier.

## Branches and delivery

- `react` is the source of truth. Branch from it and open PRs into it.
- `gh-pages` is build output written by CI. Never edit or push to it by hand.
- `master` is the old static site. Leave it alone unless asked.
- Merging to `react` deploys the live site automatically, so a green `ci` check matters.
- One focused change per PR. Keep mechanical changes (formatting, renames) in their own commit.
- In Claude Code web sessions `gh pr create` fails (GraphQL is blocked). Open PRs with
  `gh api repos/A-Crawley/a-crawley.github.io/pulls -f title=... -f head=... -f base=react -F body=@file`.

## Commands

Run these before pushing. CI runs the same steps, in this order:

```
npm run format:check   # Prettier (fix with npm run format)
npm run typecheck      # tsc, app + vite config
npm run lint           # ESLint
npm test               # Vitest, single run
npm run build          # typecheck + vite build into build/
```

Use `npm ci` for installs. Requires Node 22+.

## Environment

Supabase config is read from `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` via
`import.meta.env` (typed in `src/vite-env.d.ts`). Locally they live in `.env.local` (git-ignored).
In CI they are repository secrets. Never commit real values or log them.

## Code conventions

- TypeScript strict. No `any`; prefer `unknown` and narrow. Don't silence errors with `@ts-ignore`.
- Prettier decides formatting (`printWidth: 100`). Don't hand-format or fight it.
- Function components and hooks only. Keep hooks' dependency arrays honest (the lint rule is on).
- Styling uses the MUI theme and the `sx` prop. MUI 9 has no Typography system props
  (`fontWeight=...`); use `sx`. Plain CSS lives in `src/App.css` / `src/index.css` for the existing page.
- Keep dependencies minimal. Check that a new package is maintained and supports React 19.
- `eslint` and `typescript` are intentionally on 9.x and 6.0.x (their plugins don't support newer
  majors yet). Don't bump them without checking `eslint-plugin-react` and `typescript-eslint`.

## Component-driven design

Build the UI as small, reusable components, then compose them. Today almost everything is in
`src/App.tsx`; when you touch a part of it, extract components rather than growing it. Don't do a
large refactor nobody asked for.

- **Layout**: one folder per component, `src/components/<Name>/` containing `<Name>.tsx`,
  `<Name>.test.tsx` and an `index.ts` that re-exports it. Shared theme in `src/theme.ts`.
- **Presentational vs container**: components render props and emit callbacks; they don't fetch.
  Data access (Supabase) lives in hooks or small modules under `src/data/` or `src/hooks/`, and
  pages/containers wire data into components.
- **Props**: explicit `interface <Name>Props`, minimal and typed. Prefer composition (`children`,
  slots) over boolean-flag explosions. No prop drilling past two levels; lift to a hook or context.
- **State**: keep it as local as possible. Derive values instead of storing them.
- **Accessibility**: semantic elements, labelled controls, meaningful `alt` text, keyboard operable.
- **Reuse before create**: look for an existing component or MUI primitive first.

The `component-architect` agent can review or plan this work.

## Testing

Test behaviour the user can see, not implementation details.

- Tests sit next to the code as `*.test.tsx` / `*.test.ts`. Vitest globals and the jest-dom matchers
  are already set up (`vite.config.ts`, `src/setupTests.ts`), so `expect(...).toBeInTheDocument()` works.
- Query like a user: `getByRole`, `getByLabelText`, `getByText`. Use `findBy*` for async content.
  Avoid test IDs and class names unless there is no accessible handle.
- Never hit the network. Mock at the boundary: `vi.mock("@supabase/supabase-js", ...)` as in
  `src/App.test.tsx`. The query chain is `from().select().order().overrideTypes()`, so mocks must
  match it. Better still, move data access behind a hook and mock that.
- Every new component gets a test covering its main states: default, empty, loading/error where
  they exist, and its interactions. Every bug fix gets a regression test that fails without the fix.
- Time-dependent code (e.g. the footer year) should compute from `new Date()` in the test too, or use
  `vi.useFakeTimers()` / `vi.setSystemTime()`.
- Keep tests fast and independent: no shared mutable state, no ordering assumptions.
- `@testing-library/user-event` isn't installed. If a test needs realistic interaction, add v14
  (`npm i -D @testing-library/user-event`) rather than relying on `fireEvent`.
- Don't weaken or delete a test to get green. If a test is wrong, fix it and say why in the PR.

The `test-engineer` agent can write or review tests.

## Working style

- Read the relevant code first, then change the smallest thing that solves the problem.
- Run the full command list above and fix failures before opening a PR.
- In PR descriptions, state what changed, why, how it was verified, and anything to check after
  deploy. Be upfront about trade-offs and anything you couldn't verify.
- A change a player would notice gets a dev log entry: a Markdown file in `src/devlog/entries/`
  named `YYYY-MM-DD-short-title.md`, with `title`, `date` and `summary` in a `---` header, then
  plain paragraphs, `- ` lists, `**bold**` and `` `code` ``. Write it for players, not engineers,
  and say what is untested. It shows in the game's "Dev log" panel.
- Don't commit `build/`, `node_modules/`, `.env*` files, or secrets.
