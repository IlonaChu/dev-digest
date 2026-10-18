# Zod — parse at the boundary, trust inside

"Parse, don't validate" (Alexis King): turn untrusted input into a precise type **once, at the edge**, and let
the type carry the guarantee inward. Validation scattered through the core is a smell — it means the boundary
let something unparsed in.

## Every inbound boundary parses

| Boundary | Where it happens |
|---|---|
| HTTP request | route `schema: { params, querystring, body }` via `fastify-type-provider-zod` |
| HTTP response | `schema.response` with the contract — serialization failure becomes a logged 500, never a leak |
| LLM output | `LLMProvider.completeStructured` / reviewer-core `parseWithRepair` (Zod → JSON Schema → parse) |
| Config | `loadConfig(env)` in `platform/config.ts` → typed `AppConfig` |
| `jsonb` columns / files / external JSON | the repository or adapter parses before returning (legacy: `AgentVersionConfig.parse` in `agents/helpers.ts`) |
| Run requests built in code | `RunRequest.parse()` in the review route |

Inside services and the core, take the typed value and don't re-`parse` it.

## Contracts are the shared kernel

- Wire contracts live in `server/src/vendor/shared` (canonical) and are **copied** to `client/src/vendor/shared`;
  the copies have diverged — diff before mirroring, never assume they're identical.
- Contracts are snake_case (`cost_usd`, `run_id`); Drizzle fields are camelCase. Map at the repository/route
  boundary.
- reviewer-core imports `@devdigest/shared` from the server's vendor folder (no local copy).
- The shared kernel imports nothing from modules, adapters, platform, Drizzle, SDKs or Fastify (checked:
  `shared-kernel-is-pure`).

## Placement

- **HTTP-only schemas** (`IdParams`, pagination, `VersionParams`, request bodies that only the API accepts) stay in
  `routes.ts` or `modules/_shared/schemas.ts`. Promote to `vendor/shared` only when the client or reviewer-core
  needs the same shape.
- **Domain invariants** — use refinements and branded types so an invalid value can't be constructed
  (see the `zod` skill: `references/type-branded-types.md`).
- Zod is allowed in the core: it's pure and is how contracts travel.

## Gotchas specific to this repo

- Several Zod instances exist (server, shared, reviewer-core). `instanceof ZodError` fails across them; the error
  handler matches `ZodError` by shape too. Don't write new `instanceof ZodError` checks — let the error bubble
  to the handler, or use `safeParse`.
- reviewer-core pins `zod` to its own `node_modules` via tsconfig `paths` to avoid a second instance — keep it.

Schema-writing mechanics → `zod` skill.
