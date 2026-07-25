# Rummikub Online

A production-ready, real-time multiplayer Rummikub built with Next.js 14, Supabase, and Zustand.

> 🌐 Versión en español: [README.es.md](README.es.md)

## Stack

- **Next.js 14** (App Router, TypeScript strict mode)
- **Supabase** — Postgres, Realtime (Presence + Broadcast), anonymous Auth
- **Zustand** — client game/room state
- **Tailwind CSS** + **Framer Motion**
- **@dnd-kit/core** — accessible, touch-friendly drag and drop
- **Zod** — runtime validation for every API input
- **Vitest** + **React Testing Library**

## 1. Local setup

```bash
pnpm install
cp .env.local.example .env.local   # fill in your Supabase credentials, see below
pnpm dev
```

The app runs at `http://localhost:3000`.

## 2. Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

   Or, with the Supabase CLI linked to your project:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. **Enable Realtime** on the `rooms` and `players` tables (Database → Replication in the dashboard). These use Postgres CDC (`postgres_changes`) so the lobby updates live as players join, bots are added, and the host starts the game.
   The in-game board/rack sync (`game:{roomId}`) uses Broadcast instead, which requires no replication setup — the server sends those messages directly from the API routes.
4. **Enable Anonymous sign-ins**: Authentication → Providers → Anonymous Sign-Ins → enable. This app never asks players to register; every visitor gets a throwaway Supabase auth session used only to identify "which browser is which player."

## 3. Environment variables

Copy `.env.local.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=          # Project Settings -> API -> Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Project Settings -> API -> anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Project Settings -> API -> service_role key (SERVER ONLY)
```

The service role key bypasses Row Level Security and is only ever read inside API route handlers (`src/db/server.ts` → `getSupabaseServiceRoleClient`). It is never bundled for the client — double-check it's absent from `NEXT_PUBLIC_*` vars before deploying.

## 4. How the game logic is organized

- `src/core/` is pure TypeScript with zero React/Supabase imports: deck shuffling, set/run validation, scoring, the medium-difficulty bot, and `gameEngine.applyAction` — the single function every API route calls to mutate game state. This makes the rules unit-testable without spinning up a server.
- `src/app/api/game/action` and `src/app/api/game/draw` load the authoritative `game_states` row, run it through `applyAction`, persist with optimistic-concurrency retries (`updated_at` compare-and-swap in place of `SELECT ... FOR UPDATE`, since PostgREST doesn't expose row locks), then broadcast the sanitized public state over `game:{roomId}`.
- `src/app/api/game/_botRunner.ts` runs bot turns synchronously after a human's move, chaining through consecutive bot seats, with a broadcast `bot:thinking` pulse before each move for the "Bot thinking…" UI.
- Racks are private: `game_states.racks` (every player's tiles) is never selectable directly by anon/authenticated roles (see `002_rls_policies.sql`). Each client's own rack is delivered to it directly in API responses and via `GET /api/game/state` on load/reconnect — never broadcast to the room.

## 5. Running tests

```bash
pnpm test        # run once
pnpm test:watch  # watch mode
```

Tests live in `tests/core` (validator, scoring, bot AI, game engine) and `tests/api` (the `/api/game/action` route handler, with the DB layer mocked).

## 6. Type checking & linting

```bash
pnpm typecheck
pnpm lint
```

## 7. Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Add the three environment variables from step 3 in the Vercel project settings.
3. Deploy — `vercel.json` pins the build/install commands to `pnpm build` / `pnpm install`, no further configuration needed.

## Keyboard shortcuts (in-game)

| Key | Action |
| --- | --- |
| `Enter` | Confirm turn |
| `U` | Undo this turn's moves |
| `D` | Draw a tile |
| `Escape` | Deselect the selected tile |
| `S` | Toggle rack sort (color / number) |

## Project layout

See the top-level directories: `src/core` (rules engine), `src/db` (Supabase clients + typed queries), `src/store` (Zustand), `src/hooks` (Realtime, actions, DnD, session), `src/components` (lobby + game UI), `src/app/api` (route handlers).
