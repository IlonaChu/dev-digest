# Fastify routes — the driving adapter

`routes.ts` translates HTTP into a use-case call and back. It is the outermost ring on the way in: it may
depend on the service and contracts, and nothing inside may depend on it. Fastify itself "makes no decisions
about your application architecture" — the plugin system and encapsulation are tools, the layering is ours.

## Shape of a module's routes

```ts
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Foo } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { FooService } from './service.js';

export default async function fooRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new FooService(app.container);

  app.get('/foos/:id', { schema: { params: IdParams, response: { 200: Foo } } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const foo = await service.get(workspaceId, req.params.id);
    if (!foo) throw new NotFoundError('Foo not found');
    return foo;
  });
}
```

Register it with one import + one entry in `src/modules/index.ts` (static registry — no autoload).

## A route does

- Validate `params` / `querystring` / `body` with Zod via the type provider; the contract from
  `@devdigest/shared` doubles as response serializer.
- Resolve tenancy with `getContext(app.container, req)` and pass `workspaceId` down — every use case is
  workspace-scoped.
- Map wire input to the service's input type (camelCase/snake_case mapping happens here or in the repository,
  never in the UI), call **one** service method, set the status code (`reply.status(201)`), return the result.
- Throw `AppError` subclasses; the single `setErrorHandler` in `app.ts` builds `{ error: { code, message, details } }`.

## A route does not

- Import `drizzle-orm` / `src/db/*` or touch `app.container.db` — **checked** (`only-repositories-touch-the-db`).
  Legacy offenders: `pulls`, `settings`, `polling`, `workspace` routes and `settings/feature-models.ts`.
- Compute business results (scores, statuses, grouping) — move them to the core and unit-test them.
- Call adapters (`container.github()`, `container.git`) to do work — that orchestration belongs in the service.
- Build error responses by hand or catch-and-reshape errors the handler already maps.

## Encapsulation and DI

- Each module is an **encapsulated** plugin: its hooks/decorators are invisible to siblings. Don't wrap a
  module in `fastify-plugin` — that leaks its decorators to the parent.
- Cross-cutting plugins (helmet, cors, rate-limit, SSE, error handler) are registered in `app.ts` *before* the
  modules so every module inherits them.
- **`app.container` is the only DI decorator.** Don't `app.decorate('fooService', …)` per module; services are
  built from the Container, which is the single composition root and the single place tests override.

## SSE

`GET /runs/:id/events` bridges `runBus` to an async generator for `fastify-sse-v2`. Transport stays in the
route; services and `run-executor` publish through `RunLogger` and never know about SSE frames.

Tool mechanics (schemas, hooks, serialization, testing with `inject`) → `fastify-best-practices`.
