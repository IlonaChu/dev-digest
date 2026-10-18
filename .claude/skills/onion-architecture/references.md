# References

✔ = opened and checked on 2026-10-18 · ○ = found via search, not opened.

## Onion, hexagonal and clean architecture — primary sources

- ✔ [Jeffrey Palermo — The Onion Architecture, part 1 (2008)](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
  — the original: coupling toward the center, interfaces defined inside / implemented at the edge, "the database
  is not the center". Parts 2–4 are linked from the page.
- ✔ [Alistair Cockburn — Hexagonal Architecture (Ports & Adapters)](https://alistair.cockburn.us/hexagonal-architecture/)
  — driving vs. driven ports; run the app with a test harness instead of a UI and an in-memory store instead of a DB.
- ✔ [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
  — the Dependency Rule; only simple data structures cross boundaries, never rows or framework types.
- ✔ [Herberto Graça — Explicit Architecture: DDD, Hexagonal, Onion, Clean, CQRS… how I put it all together](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
  — ports owned by the core and shaped for its needs; components split by feature first, then by layer; shared kernel.
- ✔ [Allegro Tech — Onion Architecture (2023)](https://blog.allegro.tech/2023/02/onion-architecture.html)
  — practice report: where interfaces live, enforcing with tests vs. naming conventions, over-engineering pitfalls.
- ✔ [Martin Fowler — Repository (P of EAA)](https://martinfowler.com/eaaCatalog/repository.html)
  — "mediates between the domain and data mapping layers using a collection-like interface".
- ○ [Gary Bernhardt — Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell)
  — pure decisions inside, I/O at the edges; the model for reviewer-core and `status.ts`-style helpers.

## TypeScript / Node.js practice

- ✔ [Khalil Stemmler — Clean Node.js Architecture](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/clean-nodejs-architecture/)
  — interfaces in the policy layer, adapters in infra, wiring at the entry point.
- ✔ [Khalil Stemmler — Implementing DTOs, Mappers & the Repository Pattern](https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/)
  — `toDomain` / `toPersistence` / `toDTO` mappers; repository as a facade over the ORM.
- ✔ [Alexis King — Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
  — parse once at the boundary into a precise type; the basis of our Zod placement.
- ✔ [Remo H. Jansen — Enforce Clean Architecture in TypeScript with fresh-onion](https://dev.to/remojansen/enforce-clean-architecture-in-your-typescript-projects-with-fresh-onion-45pi)
  — Node has no module visibility, so layer rules need a tool; we use dependency-cruiser for the same job.
- ○ [Remo H. Jansen — Implementing the Onion Architecture in Node.js with TypeScript and InversifyJS](https://dev.to/remojansen/implementing-the-onion-architecture-in-nodejs-with-typescript-and-inversifyjs-10ad)
- ○ [fastify-clean-architecture (template)](https://github.com/revell29/fastify-clean-architecture)
  — domain / application / interfaces / infrastructure split on Fastify.

## Tool documentation

- ✔ [Fastify — Encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/)
  — child contexts inherit from parents only; `fastify-plugin` breaks encapsulation.
- ○ [mcollina — Fastify best practices: decorators for DI](https://tessl.io/registry/mcollina/fastify-best-practices/files/rules/decorators.md)
  — same content as our local `fastify-best-practices/rules/decorators.md`.
- ✔ [Drizzle ORM — Transactions](https://orm.drizzle.team/docs/transactions)
  — `db.transaction(async (tx) => …)`; `tx` has the same API; nested calls become savepoints.
- ○ [Drizzle entity/repository mapping (community skill)](https://skills.sh/martinffx/atelier/typescript-drizzle-orm)
- ✔ [dependency-cruiser — Rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
  — `forbidden` rules, `from`/`to` path regexes, `dependencyTypes`, group matching.
- ○ [Validate Dependencies According to Clean Architecture (dependency-cruiser)](https://betterprogramming.pub/validate-dependencies-according-to-clean-architecture-743077ea084c)
- ○ [Xebia — Taking frontend architecture serious with dependency-cruiser](https://xebia.com/blog/taking-frontend-architecture-serious-with-dependency-cruiser/)

## In this repo

- `server/docs/architecture.md` — Container, adapters, module layering, error handler, run bus.
- `reviewer-core/AGENTS.md` — the PURE rule and the engine's invariants.
- Sibling skills: `fastify-best-practices`, `drizzle-orm-patterns`, `zod`, `postgresql-table-design`.
