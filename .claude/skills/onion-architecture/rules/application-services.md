# Application services (`service.ts`)

A service is a use case: it orchestrates — load data, ask the core to decide, persist, stream — and owns no
technology. It is the imperative shell around the functional core.

## Construction

```ts
export class FooService {
  private repo: FooRepository;

  constructor(private container: Container) {
    this.repo = new FooRepository(container.db); // own repository: OK
  }
}
```

- Built by the route: `const service = new FooService(app.container)`.
- **Adapters come from the Container, never `new`:** `this.container.git`, `await this.container.github()`,
  `await this.container.llm(providerId)`, `await this.container.embedder()`, `this.container.repoIntel`.
  The `github()` / `llm()` / `embedder()` getters are async because they resolve a secret; a missing key throws
  `ConfigError` at that moment, not at boot — catch and degrade where the feature is optional (embeddings).
- **Another module's data** → `this.container.agentsRepo` / `this.container.reviewRepo`, never an import from
  `../other-module/`.

## Inside a service

- **No Drizzle**: no `drizzle-orm`, no `src/db/*` (schema, rows, client), no `sql`. If you need a query, add a
  repository method.
- **No HTTP**: no `FastifyRequest`, `reply`, status codes. Throw `NotFoundError`, `ValidationError`,
  `ExternalServiceError`, `ConfigError` or `AppError` from `platform/errors.ts`; the error handler maps them.
- **No SDKs, `fs`, `child_process`, `process.env`.** Use ports and `container.config`.
- **Decisions go to the core.** If a branch of the service is a rule ("stale if head moved and older than N
  days"), extract it into a pure function (`status.ts` / `domain.ts`) and call it. Review logic goes to
  `reviewer-core` — the server resolves context, persists and streams.
- **Inputs/outputs are contract types** (`Agent`, `Repo`, `Review` from `@devdigest/shared`) or module input
  interfaces (`CreateAgentInput`). New code does not pass Drizzle rows through the service.

## Transactions

The service asks for a *use-case-sized* repository method; the repository opens the transaction:

```ts
// service
await this.repo.replacePullSnapshot(prId, files, commits);

// repository
replacePullSnapshot(prId: string, files: NewFile[], commits: NewCommit[]) {
  return this.db.transaction(async (tx) => {
    await tx.delete(t.prFiles).where(eq(t.prFiles.prId, prId));
    if (files.length) await tx.insert(t.prFiles).values(files.map(toFileRow));
    // …
  });
}
```

Never pass `tx` through a service signature — that's Drizzle leaking inward. If one use case needs atomic
writes across two repositories, add a single method to the repository that owns the aggregate, or introduce a
small unit-of-work port; discuss before building the latter.

## Long-running and streamed work

- Background work with retries/timeouts → `container.jobs` (`JobRunner`: p-queue + `jobs` table).
- Review runs are fire-and-forget (`void this.executor.executeRuns(...)`) and stream through `RunLogger` →
  `runBus` → SSE; keep that split (see `server/docs/architecture.md`). The service publishes events; the route
  owns the SSE transport.
- Outbound calls get `withTimeout` / `withRetry` from `platform/resilience.ts` inside the adapter, not ad hoc in the service.
