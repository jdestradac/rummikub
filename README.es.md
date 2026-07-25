# Rummikub Online

Un juego de Rummikub multijugador en tiempo real, listo para producción, construido con Next.js 14, Supabase y Zustand.

> 🌐 English version: [README.md](README.md)

## Stack tecnológico

- **Next.js 14** (App Router, TypeScript en modo estricto)
- **Supabase** — Postgres, Realtime (Presence + Broadcast), Auth anónima
- **Zustand** — estado del juego/sala en el cliente
- **Tailwind CSS** + **Framer Motion**
- **@dnd-kit/core** — arrastrar y soltar accesible y compatible con pantallas táctiles
- **Zod** — validación en tiempo de ejecución para cada entrada de la API
- **Vitest** + **React Testing Library**

## 1. Configuración local

```bash
pnpm install
cp .env.local.example .env.local   # completa tus credenciales de Supabase, ver abajo
pnpm dev
```

La app corre en `http://localhost:3000`.

## 2. Configuración del proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com). 
2. En el SQL Editor, ejecuta las migraciones en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

   O, con el CLI de Supabase vinculado a tu proyecto:

   ```bash
   supabase link --project-ref <tu-project-ref>
   supabase db push
   ```
3. **Activa Realtime** en las tablas `rooms` y `players` (Database → Replication en el panel). Estas usan Postgres CDC (`postgres_changes`) para que la sala de espera se actualice en vivo cuando los jugadores se unen, se agregan bots y el anfitrión inicia la partida.
   La sincronización del tablero/atril durante la partida (`game:{roomId}`) usa Broadcast en su lugar, lo cual no requiere configuración de replicación — el servidor envía esos mensajes directamente desde las rutas de la API.
4. **Activa el inicio de sesión anónimo**: Authentication → Providers → Anonymous Sign-Ins → habilitar. Esta app nunca pide a los jugadores que se registren; cada visitante obtiene una sesión de autenticación de Supabase desechable que solo se usa para identificar "qué navegador es qué jugador".

## 3. Variables de entorno

Copia `.env.local.example` a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=          # Project Settings -> API -> Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Project Settings -> API -> anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Project Settings -> API -> service_role key (SOLO SERVIDOR)
```

La service role key evita (bypass) el Row Level Security y solo se lee dentro de los manejadores de rutas de la API (`src/db/server.ts` → `getSupabaseServiceRoleClient`). Nunca se empaqueta para el cliente — verifica que esté ausente de las variables `NEXT_PUBLIC_*` antes de desplegar.

## 4. Cómo está organizada la lógica del juego

- `src/core/` es TypeScript puro, sin importaciones de React ni Supabase: barajado del mazo, validación de conjuntos/escaleras, puntuación, el bot de dificultad media y `gameEngine.applyAction` — la única función que llama cada ruta de la API para mutar el estado del juego. Esto hace que las reglas sean testeables unitariamente sin necesidad de levantar un servidor.
- `src/app/api/game/action` y `src/app/api/game/draw` cargan la fila autoritativa de `game_states`, la procesan con `applyAction`, la persisten con reintentos de concurrencia optimista (comparación de `updated_at` en lugar de `SELECT ... FOR UPDATE`, ya que PostgREST no expone bloqueos de fila), y luego transmiten el estado público sanitizado por `game:{roomId}`.
- `src/app/api/game/_botRunner.ts` ejecuta los turnos de los bots de forma síncrona después del movimiento de un humano, encadenando asientos de bots consecutivos, con un pulso de broadcast `bot:thinking` antes de cada movimiento para la UI "Bot pensando…".
- Los atriles son privados: `game_states.racks` (las fichas de cada jugador) nunca es seleccionable directamente por los roles anon/authenticated (ver `002_rls_policies.sql`). El atril propio de cada cliente se entrega directamente en las respuestas de la API y mediante `GET /api/game/state` al cargar/reconectar — nunca se transmite (broadcast) a la sala.

## 5. Ejecutar las pruebas

```bash
pnpm test        # ejecutar una vez
pnpm test:watch  # modo watch
```

Las pruebas están en `tests/core` (validador, puntuación, IA del bot, motor del juego) y `tests/api` (el manejador de la ruta `/api/game/action`, con la capa de base de datos simulada/mockeada).

## 6. Verificación de tipos y linting

```bash
pnpm typecheck
pnpm lint
```

## 7. Despliegue en Vercel

1. Sube este repositorio a GitHub/GitLab/Bitbucket e impórtalo en Vercel.
2. Agrega las tres variables de entorno del paso 3 en la configuración del proyecto en Vercel.
3. Despliega — `vercel.json` fija los comandos de build/install a `pnpm build` / `pnpm install`, no se necesita configuración adicional.

## Atajos de teclado (durante la partida)

| Tecla | Acción |
| --- | --- |
| `Enter` | Confirmar turno |
| `U` | Deshacer los movimientos de este turno |
| `D` | Robar una ficha |
| `Escape` | Deseleccionar la ficha seleccionada |
| `S` | Alternar orden del atril (color / número) |

## Estructura del proyecto

Consulta los directorios de nivel superior: `src/core` (motor de reglas), `src/db` (clientes de Supabase + consultas tipadas), `src/store` (Zustand), `src/hooks` (Realtime, acciones, DnD, sesión), `src/components` (UI de la sala y del juego), `src/app/api` (manejadores de rutas).
