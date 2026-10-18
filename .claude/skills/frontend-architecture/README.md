# frontend-architecture — source catalog

> **Status:** source catalog behind the `frontend-architecture` skill. Rules cite the IDs below.
> Researched 2026-10-18 (React 19, React Compiler 1.0, Next.js 16.x, TanStack Query v5, TypeScript 5.8+).

| File | Purpose |
|------|---------|
| [SKILL.md](SKILL.md) | The rules: where code goes, how it is split, review checklist |
| [examples.md](examples.md) | Good/bad code for each rule |
| [enforcement.md](enforcement.md) | Lint and tooling setups (boundaries, cycles, Knip, naming) |
| README.md | This catalog: sources, consensus, disagreements |

The future `frontend-architecture` skill answers *where code goes* in a React / Next.js (App Router) + TanStack Query +
TypeScript frontend: where components live, how they are split and composed, where business logic, constants,
utils/helpers, types and each kind of state belong, and how module boundaries are enforced. It complements
[react-best-practices](../react-best-practices/SKILL.md) (hooks, state, performance anti-patterns) and
[next-best-practices](../next-best-practices/SKILL.md) (App Router APIs, RSC boundaries).

**How sources were checked:** every URL was fetched with WebFetch on 2026-10-18 unless marked *unverified*. The fetch tool
summarizes pages, so quotes below may be lightly paraphrased. Re-check a quote against the page before citing it in `SKILL.md`.
Dates are publication or last-updated dates, not site copyright years.

## Contents

1. [Questions → sources](#questions--sources)
2. [Source catalog](#source-catalog)
3. [Consensus](#consensus)
4. [Disagreements and proposed stance](#disagreements-and-proposed-stance)
5. [Unverified and failed URLs](#unverified-and-failed-urls)

---

## Questions → sources

| # | Question the skill answers | Primary sources |
|---|----------------------------|-----------------|
| Q1 | Where do components live (shared vs feature vs page-private)? | N1, N12, B1, F1–F5, S1–S5, S9, S11 |
| Q2 | When and how to split a component; how to compose it | R1, R6–R8, C1–C17, N4, N5 |
| Q3 | Where does business / domain logic live? | L1–L6, R2, R3, R9, D9, D13 |
| Q4 | How to structure the API / data layer | N6–N9, T1–T4, D1–D8, B1, L3 |
| Q5 | Where does each kind of state live (server, URL, local, global)? | R4–R7, D7–D16, T3, T6, N12, B1 |
| Q6 | Where do constants and config / env live? | K1–K5, TS1, TS2, N6, N10, D15, D16, F2, S2 |
| Q7 | What goes in `utils/` vs `helpers/` vs `lib/`; where do types live? | B1, F2, S2, S3, K4, S1, S9 |
| Q8 | Module boundaries, public APIs, barrels, naming | B1, F1–F3, BF1–BF5, R10, S3, S5, A1, A2 |
| Q9 | How to enforce structure with tooling | E1–E8, B1, F3 |
| Q10 | How to keep logic testable | TE1–TE3, T5, L1, L2, L5, R9 |

---

## Source catalog

ID prefixes: **R** react.dev · **N** Next.js · **T** TanStack · **TS** TypeScript · **B/F/A** reference architectures ·
**S** structure essays · **C** components & composition · **L** logic & layering · **D** data layer & state ·
**K** constants, enums, types · **BF** barrel files · **E** enforcement tooling · **TE** testing.

### 1. Official docs — React (react.dev)

**R1 · Thinking in React** — React team · living docs · official
<https://react.dev/learn/thinking-in-react> · Q2, Q5
- A component should "ideally only be concerned with one thing"; if it grows, decompose it into subcomponents.
- Components map to pieces of the data model; nest them as they nest in the mockup.
- Build a static version with props first; state is "reserved only for interactivity".
- Minimal state: not state if it never changes, comes from props, or can be computed.
- State goes in the closest common parent (or a new component that only holds it); children ask for changes via callbacks.
- *Caveat:* client-only example; admits splitting a table header is "partly a matter of preference".

**R2 · Keeping Components Pure** — official
<https://react.dev/learn/keeping-components-pure> · Q3, Q10
- Same props/state/context → same JSX. Never mutate pre-existing variables during render; local mutation is fine.
- Side effects belong in event handlers; `useEffect` is the last resort.
- Don't rely on render order; Strict Mode double-renders in dev to catch impurity.

**R3 · Reusing Logic with Custom Hooks** — official
<https://react.dev/learn/reusing-logic-with-custom-hooks> · Q2, Q3, Q7
- "You don't need to extract a custom Hook for every little duplicated bit of code. Some duplication is fine."
- Wrap Effects in custom hooks; goal: most Effects live inside hooks.
- Hooks share *stateful logic*, not state — each call is independent.
- "Functions that don't call Hooks don't need to be Hooks" → `getSorted`, not `useSorted`.
- No lifecycle wrappers (`useMount`, `useEffectOnce`); name hooks after concrete use cases (`useChatRoom`). No clear name → not ready to extract.

**R4 · You Might Not Need an Effect** — official
<https://react.dev/learn/you-might-not-need-an-effect> · Q3, Q5
- No external system → no Effect. Compute derived values during render; `useMemo` only when measurably expensive.
- Reset state with `key`, not an Effect. Store an ID and derive the selected object.
- Interaction logic goes in the handler; share between handlers via a plain function.
- Don't notify parents from Effects; prefer framework/library data fetching.

**R5 · Choosing the State Structure** — official
<https://react.dev/learn/choosing-the-state-structure> · Q5
- Merge state that changes together; avoid contradictions (one `status` instead of `isSending` + `isSent`).
- Avoid redundant/duplicated state; store `selectedId`, not a copy. Prefer flat, normalized state.
- Don't mirror props in state; name such props `initialX` / `defaultX`.

**R6 · Sharing State Between Components** — official
<https://react.dev/learn/sharing-state-between-components> · Q2, Q5
- Lift to the closest common parent; every piece of state has exactly one owner.
- Controlled vs uncontrolled is a trade-off (flexibility vs ease of use); you can refactor later.

**R7 · Passing Data Deeply with Context** — official
<https://react.dev/learn/passing-data-deeply-with-context> · Q2, Q5
- Order: pass props → pass JSX as `children` → context. Passing a dozen props through a dozen components is "not unusual".
- Middle components only forwarding props means "you forgot to extract some components".
- Context fits theme, current account, routing, reducer-managed state. React 19: `<Ctx value={…}>`.

**R8 · Passing Props to a Component** — official
<https://react.dev/learn/passing-props-to-a-component> · Q2
- `children` is a "hole" the parent fills — use it for cards, panels, layouts.
- "Use spread syntax with restraint" — spreading everywhere means split components and pass children.

**R9 · Scaling Up with Reducer and Context** / **Extracting State Logic into a Reducer** — official
<https://react.dev/learn/scaling-up-with-reducer-and-context> · <https://react.dev/learn/extracting-state-logic-into-a-reducer> · Q3, Q5, Q10
- One file can hold reducer + state context + dispatch context + provider + hooks (`useTasks`, `useTasksDispatch`).
- Reducers are pure and "can be exported and tested separately in isolation". Actions describe what the user did.

**R10 · Importing and Exporting Components** — official
<https://react.dev/learn/importing-and-exporting-components> · Q8
- One default export max per file; component and file names should match; avoid anonymous default exports.

**R11 · Rules of React** — official
<https://react.dev/reference/rules> · Q2, Q3
- Components/hooks are idempotent; props, state, hook args/returns and JSX values are immutable.
- Never call component functions directly; never pass hooks around as values; hooks only at top level.
- These are rules, not guidelines — breaking them causes bugs and blocks the compiler.

**R12 · React Compiler** — docs + "React Compiler v1.0" (Lauren Tan, Joe Savona, Mofei Zhang, 2025-10-07)
<https://react.dev/learn/react-compiler/introduction> · <https://react.dev/blog/2025/10/07/react-compiler-1> · Q2
- Stable; memoizes automatically. New code: rely on it, use `useMemo`/`useCallback` mainly for precise control (stable Effect deps).
- Existing code: keep existing memoization or test carefully before removing it.
- Compiler lint rules ship in `eslint-plugin-react-hooks` recommended.

**R13 · React v19** — 2024-12-05 · official blog
<https://react.dev/blog/2024/12/05/react-19> · Q2
- `ref` is a regular prop (no `forwardRef` in new code); `<Context>` as provider; `use(Context)` may be called conditionally.

**R14 · File Structure FAQ (legacy docs, frozen at v18.2)** — official
<https://legacy.reactjs.org/docs/faq-structure.html> · Q1
- Two options: group by feature/route or by file type; React has no opinion.
- Avoid deep nesting (≈3–4 levels max); "Don't spend more than five minutes" choosing; colocate files that change together.
- *Caveat:* react.dev has no replacement page.

### 2. Official docs — Next.js (App Router, Next 16.x)

**N1 · Project structure and organization** — lastUpdated 2026-07-21
<https://nextjs.org/docs/app/getting-started/project-structure> · Q1, Q7
- Next.js is "unopinionated" — pick one strategy and be consistent.
- Colocation inside `app/` is safe: only `page`/`route` files become public.
- `_private` folders opt out of routing (`app/blog/_components/Post.tsx`, `app/blog/_lib/data.ts`).
- `(group)` folders organize by section/team without changing URLs.
- Three strategies: files outside `app/`; top-level folders inside `app/`; split by feature/route.
- `components/` and `lib/` have "no special framework significance".

**N2 · `src` folder** — 2025-10-17
<https://nextjs.org/docs/app/api-reference/file-conventions/src-folder> · Q1
- `public/`, config and `.env*` stay at the root; update `@/*` paths when moving to `src/`.

**N3 · Route Groups** — 2025-06-16
<https://nextjs.org/docs/app/api-reference/file-conventions/route-groups> · Q1
- Navigating between different root layouts causes a full reload; two groups resolving to the same path is an error.

**N4 · Server and Client Components** — lastUpdated 2026-10-05
<https://nextjs.org/docs/app/getting-started/server-and-client-components> · Q2, Q8, Q9
- A `'use client'` file pulls all its imports into the client bundle → put it on small interactive leaves.
- Pass Server Components into Client Components via `children`/props (slots).
- Render providers "as deep as possible"; wrap third-party client-only components in your own `'use client'` file.
- `import 'server-only'` / `'client-only'` turns wrong-environment imports into build errors. Props crossing to the client must be serializable.

**N5 · The Server and Client Boundary** — lastUpdated 2026-10-05
<https://nextjs.org/docs/app/guides/server-and-client-boundary> · Q2, Q8
- Code crosses via imports; data crosses via serializable props. The *owner* decides where a component runs.
- **Compound components with static members (`Menu.Item`) break** when a Server Component imports them — use named exports.
- `'use client'` only at the entry of a client subtree; put it on a thin wrapper to keep shared components untouched.

**N6 · Data Security (Data Access Layer)** — lastUpdated 2026-10-06
<https://nextjs.org/docs/app/guides/data-security> · Q4, Q6
- Pick **one** approach: external HTTP API, **Data Access Layer** (recommended for new projects), or component-level access (prototypes).
- DAL is `server-only`, does authorization, returns minimal DTOs. "Only the Data Access Layer should access `process.env`."
- `"use server"` actions stay thin: validate → delegate to DAL → revalidate; re-check auth in every action.

**N7 · How to Think About Security in Next.js** — Sebastian Markbåge · 2023-10-23 · official blog
<https://nextjs.org/blog/security-nextjs-server-components-actions> · Q4
- Original source of the three data-access models; classes for DAL records, taint APIs.
- *Caveat:* older API shapes (sync `cookies()`); prefer N6.

**N8 · Fetching Data** — lastUpdated 2026-09-01
<https://nextjs.org/docs/app/getting-started/fetching-data> · Q4
- Fetch in Server Components where data is needed (identical `fetch` is memoized); `React.cache` for non-fetch functions.
- `Promise.all` for parallel requests; keep `preload()` next to the consuming component.

**N9 · Client-side data fetching** / **…with TanStack Query** — lastUpdated 2026-10-15
<https://nextjs.org/docs/app/guides/client-side-data-fetching> · <https://nextjs.org/docs/app/guides/client-side-data-fetching/tanstack-query> · Q4, Q5
- Read-once data: pass a promise and `use()` it; use a library only when a shared browser cache is needed.
- `QueryClientProvider` in the **nearest shared layout**, not necessarily the root.
- Colocated **"cache contract"** module (`product-cache.ts`: `key()`, `options()` via `queryOptions`, `tag()`), "free of server-only and client-only imports".
- Three cache layers (Next server, Next client, TanStack) — keep identities and invalidation coordinated.

**N10 · Environment variables** — lastUpdated 2026-08-25
<https://nextjs.org/docs/app/guides/environment-variables> · Q6
- Server-only by default; `NEXT_PUBLIC_*` is inlined at build time and frozen; `process.env[name]` lookups are not inlined.

**N11 · `optimizePackageImports`** (experimental) — 2025-12-19
<https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports> · Q8
- Loads only used modules from big-barrel npm packages; ~27 libraries enabled by default (`lucide-react`, `date-fns`, …).

**N12 · Next.js Learn: Dashboard App** — official course
<https://nextjs.org/learn/dashboard-app/getting-started> · <https://nextjs.org/learn/dashboard-app/adding-search-and-pagination> · Q1, Q5, Q7
- `app/lib` for utils + data fetching, `app/lib/definitions.ts` for types, `app/ui` for components (teaching layout, not a scale recommendation).
- URL search params as bookmarkable/shareable state; `useSearchParams` + `replace`, debounced.

### 3. Official docs — TanStack and TypeScript

**T1 · Query Options** — TanStack Query docs
<https://tanstack.com/query/latest/docs/framework/react/guides/query-options> · Q4
- `queryOptions` is identity at runtime; value is types + colocating `queryKey` with `queryFn`.
- One factory shared by hooks and imperative calls; override per call site (e.g. `select`) by spreading.

**T2 · Query Keys**
<https://tanstack.com/query/latest/docs/framework/react/guides/query-keys> · Q4
- Top-level arrays, serializable, include every variable the `queryFn` depends on; links to D2 and Query Key Factory for large apps.

**T3 · Important Defaults** / **Does this replace client state?**
<https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults> · <https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state> · Q5, Q6
- Stale immediately by default; refetch on mount/focus/reconnect; `gcTime` 5 min; 3 retries. Raise `staleTime` for slow data.
- Not a replacement for client state — after moving async data out, little global client state remains (theme, sidebar).

**T4 · Advanced Server Rendering**
<https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr> · Q4, Q5
- New `QueryClient` per server request, singleton in the browser; default `staleTime` > 0.
- Prefetch in Server Components + `HydrationBoundary`; "Treat Server Components as a place to prefetch data, nothing more."

**T5 · Testing**
<https://tanstack.com/query/latest/docs/framework/react/guides/testing> · Q10
- `renderHook` with a wrapper creating a fresh `QueryClient` per test; turn retries off; mock at the network (nock/MSW).

**T6 · Search Params Are State** — Tanner Linsley · 2025-06-03 · official blog
<https://tanstack.com/blog/search-params-are-state> · related: <https://tanstack.com/router/latest/docs/framework/react/guide/search-params> · Q5
- Search params are global, serializable, shareable state; declare the schema once at the route, validate + default at the boundary.
- Per-hook tools (nuqs) are ergonomic but schemas can drift without route-level coordination.

**TS1 · TypeScript Handbook: Enums ("Objects vs Enums")** — Microsoft
<https://www.typescriptlang.org/docs/handbook/enums.html> · Q6
- "In modern TypeScript, you may not need an enum when an object with `as const` could suffice"; derive the type with `typeof O[keyof typeof O]`.
- Avoid ambient `const enum` (breaks with `isolatedModules`).

**TS2 · TypeScript 5.8: `--erasableSyntaxOnly`** — 2025
<https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html> · Q6
- With the flag, `enum`, runtime namespaces, parameter properties and `import =` are errors — aligns with Node type stripping.

### 4. Reference architectures

**B1 · Bulletproof React** — Alan Alickovic · repo (~36k★), last commit 2024-11 · opinionated reference
<https://github.com/alan2207/bulletproof-react> · Q1, Q4, Q5, Q7, Q8, Q9, Q10
Docs (all under `https://github.com/alan2207/bulletproof-react/blob/master/docs/`):
- [`project-structure.md`](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) —
  `src/{app, assets, components, config, features, hooks, lib, stores, testing, types, utils}`; `features/` is "where most code should live";
  a feature has only the folders it needs (`api, components, hooks, stores, types, utils`). **No cross-feature imports** — "compose different
  features at the application level". One-way deps shared → features → app, enforced with `import/no-restricted-paths`. **Barrels discouraged.**
  Definitions: `lib` = "reusable libraries preconfigured for the application", `utils` = "shared utility functions", `config` = "global
  configurations, exported env variables". Next.js variant in `apps/nextjs-app/src`.
- [`project-standards.md`](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-standards.md) — ESLint, Prettier, TS, Husky; `@/*` alias; kebab-case files/folders via `eslint-plugin-check-file`.
- [`components-and-styling.md`](https://github.com/alan2207/bulletproof-react/blob/master/docs/components-and-styling.md) — colocate; no nested `renderX()` functions, extract components; too many props → split or compose via children/slots; wrap third-party components; identify repetition before abstracting.
- [`api-layer.md`](https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md) — one preconfigured API client; one file per request (`features/<f>/api/get-discussions.ts`) with types/schema + fetcher + query hook.
- [`state-management.md`](https://github.com/alan2207/bulletproof-react/blob/master/docs/state-management.md) — five categories: component, application, server cache, form, URL; start local.
- [`testing.md`](https://github.com/alan2207/bulletproof-react/blob/master/docs/testing.md) — integration-first; unit-test shared utils and complex logic; MSW; Playwright e2e.
- *Caveat:* Vite-centric wording; "fetcher + hook per request" predates `queryOptions`-first advice (D5, D6); disagrees with FSD on barrels and segment names.

**F1 · Feature-Sliced Design: Layers** — FSD core team · v2.1 docs
<https://feature-sliced.design/docs/reference/layers> · Q1, Q8
- Layers top → bottom: app, (processes — deprecated), pages, widgets, features, entities, shared.
- "A module in a slice can only import other slices when they are located on layers strictly below." app and shared have no slices.
- Not every layer is needed; most projects need at least shared, pages, app.

**F2 · FSD: Slices and Segments**
<https://feature-sliced.design/docs/reference/slices-segments> · Q1, Q7, Q8
- Slices = business domains, no imports between slices on the same layer.
- Segments named by **purpose**: `ui`, `api`, `model` (schemas, stores, business logic), `lib`, `config` — `components`, `hooks`, `types` are "bad segment names".
- `shared/lib` is not a helpers dump — each library has one focus and a README; `shared/config` for env/flags; `shared/routes` for route constants.

**F3 · FSD: Public API**
<https://feature-sliced.design/docs/reference/public-api> · Q8, Q9
- Each slice has an `index` as its public API; avoid `export *`.
- Relative imports inside a slice, aliased imports across slices.
- In `shared/ui` / `shared/lib`, **one index per component/library**, not one giant barrel. Per-runtime APIs (`index.server.ts`).
- Entity cross-imports via `@x` notation only.

**F4 · FSD: Usage with Next.js**
<https://feature-sliced.design/docs/guides/tech/with-nextjs> · Q1
- Next's `app/` at project root; FSD layers in `src/` with `_app` / `_pages`; route files only re-export (`export { ExamplePage as default } from '@/_pages/example'`).
- *Caveat:* still says "middleware", not Next 16 `proxy.ts`.

**F5 · FSD: Migration v2.0 → v2.1 ("pages first")**
<https://feature-sliced.design/docs/guides/migration/from-v2-0> · Q1
- "Keep most of the UI and logic in each individual page"; move down a layer only when several pages need it.

**F6 · FSD: Overview**
<https://feature-sliced.design/docs/get-started/overview> · Q1
- For apps, not libraries; adoptable incrementally; "If the current architecture works, maybe it's not worth changing."

**A1 · Epic Stack decision docs** — Kent C. Dodds et al. · ADRs
<https://github.com/epicweb-dev/epic-stack/tree/main/docs/decisions> · Q8
- 031-imports (2023): `package.json` `"imports"` with `#app/...`; 046-remove-path-aliases (2025-10): drop tsconfig `paths`, use only `package.json#imports`.
- *Caveat:* Remix/React Router, not Next.js.

**A2 · Turborepo: Structuring a repository** — Vercel · lastUpdated 2026-10-16
<https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository> · Q8
- `apps/` + `packages/`; `package.json` `exports` subpaths instead of barrels; never reach across packages with `../`.

### 5. Folder structure and colocation

**S1 · Colocation** — Kent C. Dodds · 2019-06-17 · blog
<https://kentcdodds.com/blog/colocation> · Q1, Q7, Q10
- "Place code as close to where it's relevant as possible"; "things that change together should be located as close as reasonable" (Abramov).
- Unit tests next to files; e2e at the root. Don't move to a shared `utils/` "just in case".

**S2 · Delightful React File/Directory Structure** — Josh W. Comeau · 2022-03-15, updated 2025-12-03 · blog
<https://www.joshwcomeau.com/react/file-structure/> · Q1, Q6, Q7, Q8
- `src/components/<Name>/` with `index.ts` → `<Name>.tsx`; sub-components, hooks, helpers used only there live in the same folder.
- **Helper** = project-specific (`src/helpers/*.helpers.ts`, `X.helpers.ts`); **utility** = generic, portable (`src/utils.ts`).
- App-wide `src/constants.ts`; component-scoped `X.constants.ts`; `X.types.ts`.
- *Dissent:* organizes **by function, not feature** ("categorization is actually really hard"); defends index files in app code; with App Router he replaced `export *` with explicit named re-exports.

**S3 · React Folder Structure in 5 Steps [2026]** — Robin Wieruch · updated 2026-05-05 · blog
<https://www.robinwieruch.de/react-folder-structure/> · Q1, Q7, Q8
- Grow in stages: single file → multiple files → component folders → technical folders → `features/`.
- Hook moves to `hooks/` only when 2+ components use it; util used by one feature stays in it, by 2+ features → shared.
- "Features don't import from each other"; `index` optional as public API; whole-barrels "getting out of fashion". kebab-case.
- `lib/` = "pre-configured wrappers around third-party libraries". Next.js: keep feature code **outside** `app/`, not in private folders.

**S4 · Feature-based React Architecture** — Robin Wieruch · 2024-11-25 · blog
<https://www.robinwieruch.de/react-feature-architecture/> · Q1, Q4
- `features/<f>/components/*.tsx` + `features/<f>/queries/get-*.ts`; compose features in the page with parallel fetching.

**S5 · Screaming Architecture: Evolution of a React folder structure** — Johannes Kettmann (Profy.dev) · 2022-02-25 · blog
Mirror: <https://dev.to/profydev/screaming-architecture-evolution-of-a-react-folder-structure-4g25> (canonical `profy.dev/article/react-folder-structure` did not resolve) · Q1, Q8
- Five stages ending in group-by-feature with thin `pages/`; each feature's `index.js` is its public API; absolute imports; kebab-case (Linux case-sensitivity CI failure).
- Follow-up series "Path To A Clean(er) React Architecture" (8 parts, 2024: API client, DTOs, DI, domain logic, React Query): <https://dev.to/jkettmann>.

**S6 · Tao of React** — Alex Kondov · 2021-01-18 · blog
<https://alexkondov.com/tao-of-react/> · Q1
- "Group by route/module from the start"; a common module for buttons/inputs; absolute paths; adapters for external components.
- *Caveat:* pre-RSC; creates the common module up front (tension with AHA / FSD pages-first).

**S7 · Screaming Architecture** — Robert C. Martin · 2011-09-30 · blog
<https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html> · Q1
- Top-level structure should reveal use cases, not the framework. "Frameworks are tools to be used, not architectures to be conformed to."

**S8 · "move files around until it feels right"** — attributed to Dan Abramov · undated joke page
<https://react-file-structure.surge.sh/> · Q1
- "…this is not a joke." *Unverified:* the original tweet and its date.

**S9 · The Vertical Codebase** — Dominik Dorfmeister (TkDodo) · 2026-04-13 · blog
<https://tkdodo.eu/blog/the-vertical-codebase> · Q1, Q6, Q7, Q8, Q9
- Top-level folders by **vertical** (what the code does), not technical type (`components/`, `hooks/`, `utils/`, `types/`, `constants/`).
- Query options, types, utils and constants live in the vertical that owns them; start verticals from routes/pages.
- Each vertical has a public interface — enforce via `package.json` `exports`, Nx or `eslint-plugin-boundaries`. Notes AI agents need the same boundaries.

**S10 · What Does "use client" Do?** — Dan Abramov · 2025-04-25 · blog
<https://overreacted.io/what-does-use-client-do/> · Q8
- Directives are module-system features ("two worlds, two doors"); the boundary is an `import`, so typecheck, find-references and dead-code tools see it.

**S11 · shadcn/ui `components.json`** — shadcn · tool docs
<https://ui.shadcn.com/docs/components-json> · Q1, Q7
- Aliases `components`, `ui`, `lib`, `hooks`, `utils` (e.g. `@/lib/utils`); supports tsconfig paths or `package.json#imports`.

**S12 · Next.js 16 App Router Project Structure** — Makerkit · 2024-12 (tested on Next 16) · vendor blog, secondary
<https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure> · Q1, Q4
- Route-level `_components/` + `_lib/`; `server/` or `.server.ts` with `server-only`; thin actions → `*.service.ts`; `feature.type.ts` naming.
- *Caveat:* promotes the vendor kit; contradicts S3 on `_components` inside `app/`.

### 6. Component decomposition and composition

**C1 · Presentational and Container Components** — Dan Abramov · ~2015, 2019 update · blog
<https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0> (HTTP 403; read via mirror <https://readmedium.com/smart-and-dumb-components-7ca2f9a7c7d0>) · Q2
- Historical split: presentational = how things look; container = how things work.
- 2019 note: "I don't *suggest* splitting your components like this anymore" — hooks separate stateful logic "without an arbitrary division".

**C2 · Before You memo()** — Dan Abramov · 2021-02-23 · blog
<https://overreacted.io/before-you-memo/> · Q2
- **Move state down** into a smaller component; **lift content up** via `children`. Try both before `memo`. Still valid structure under the compiler.

**C3 · Writing Resilient Components** — Dan Abramov · 2019-03-16 · blog
<https://overreacted.io/writing-resilient-components/> · Q2
- Don't stop the data flow; always be ready to render; no component is a singleton; keep local state isolated.

**C4 · The WET Codebase** — Dan Abramov · Deconstruct 2019 · talk
<https://deconstructconf.com/2019/dan-abramov-the-wet-codebase> · blog pointer <https://overreacted.io/the-wet-codebase/> · Q2
- Shared abstractions accrete flags until "weird and intimidating"; inline and accept duplication; test concrete behavior so inlining is safe.

**C5 · When to break up a component into multiple components** — Kent C. Dodds · 2019-07-19 · blog
<https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components> · Q2
- Long components are fine. Split on a real problem: performance, reuse, state complexity, testing, merge conflicts, wrapping imperative APIs — "NOT BEFORE".

**C6 · AHA Programming** — Kent C. Dodds · 2020-06-22 · blog
<https://kentcdodds.com/blog/aha-programming> · Q2, Q7
- "Avoid Hasty Abstractions"; "prefer duplication over the wrong abstraction"; "optimize for change first".

**C7 · Inversion of Control** — Kent C. Dodds · 2019-11-18 · blog
<https://kentcdodds.com/blog/inversion-of-control> · Q2
- Every boolean option multiplies combinations; "make your abstraction do less stuff, and make your users do that instead". Not for single use cases.

**C8 · React Hooks: Compound Components** — Kent C. Dodds · 2019-02-18 · blog
<https://kentcdodds.com/blog/compound-components-with-react-hooks> · Q2
- Parent holds state in context; children read it via a hook that throws outside the provider.

**C9 · State Reducer** (2020) / **Prop Getters** (2017) — Kent C. Dodds · blog
<https://kentcdodds.com/blog/the-state-reducer-pattern-with-react-hooks> · <https://kentcdodds.com/blog/how-to-give-rendering-control-to-users-with-prop-getters> · Q2
- Inverted control for complex reusable hooks (Downshift-style); the cost: state transitions become part of the API.

**C10 · The Wrong Abstraction** — Sandi Metz · 2016-01-20 · blog
<https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction> · Q2, Q7
- "Prefer duplication over the wrong abstraction". Smell: parameters and conditionals per caller. Fix: inline back into callers, delete unused parts, re-extract.

**C11 · patterns.dev — React patterns** — guides (author/date not shown)
<https://www.patterns.dev/react/presentational-container-pattern> · <https://www.patterns.dev/react/hooks-pattern> ·
<https://www.patterns.dev/react/compound-pattern> · <https://www.patterns.dev/react/render-props-pattern> ·
<https://www.patterns.dev/react/hoc-pattern> · <https://www.patterns.dev/react/react-2026> · Q2
- "Modern React strongly favors Hooks over container components"; container/presentational can be overkill.
- Compound: prefer context over `Children.map` + `cloneElement`.
- "Render props are no longer the default tool for sharing logic — custom hooks are"; a wrapper returning `props.children(data)` "wants to be a hook".
- HOCs: name collisions, wrapper hell, hidden props; fine for library-level cross-cutting concerns.

**C12 · Atomic Design** — Brad Frost · 2013 post, 2016 book
<https://bradfrost.com/blog/post/atomic-web-design/> · <https://atomicdesign.bradfrost.com/chapter-2/> · <https://bradfrost.com/links/post/where-atomic-design-fell-short/> · Q1, Q2
- Atoms → molecules → organisms → templates → pages; "a mental model", "not a linear process". Does **not** prescribe folders.
- *Critique (practitioners):* ambiguous placement ("is a modal an organism?"), poor findability; common compromise — atomic-ish levels only in the shared UI library.

**C13 · Radix Primitives: Composition (`asChild`) and Slot** — official docs
<https://www.radix-ui.com/primitives/docs/guides/composition> · <https://www.radix-ui.com/primitives/docs/utilities/slot> · Q2
- `asChild` clones the child with behavior props; your component must spread props and accept a ref; nestable. Docs still show `forwardRef` (unneeded in React 19).

**C14 · shadcn/ui: Introduction** — official docs
<https://ui.shadcn.com/docs> · Q1, Q2
- "Not a component library. It is how you build your component library." Open code, composition, "a common, composable interface".

**C15 · Base UI: Composition** — official docs
<https://base-ui.com/react/handbook/composition> · Q2
- `render` prop for element substitution (`render={<MyButton />}`); must forward ref and spread props.

**C16 · Component Composition is great btw** — TkDodo · 2024-09-21 · blog
<https://tkdodo.eu/blog/component-composition-is-great-btw> · Q2
- Mutually exclusive states (loading/empty/error/data) → shared `Layout` with `children` + early returns instead of nested ternaries. "Cognitive load is what matters."

**C17 · Composition Is All You Need** — Fernando Rojo (Vercel) · React Universe Conf 2025 · talk + Vercel agent skill
Talk <https://www.youtube.com/watch?v=4KvbVq3Eg5w> (title only verified) · commentary Ian Duvall <https://www.ianduvall.com/blog/composition> ·
skill <https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns> · Q2
- Boolean-prop explosion → "God" components; build explicit variants (`ThreadComposer`, `EditComposer`) from compound subcomponents reading context.
- State in providers behind a generic `state/actions/meta` interface; `children` over `renderX` props; React 19: no `forwardRef`, `use()`.
- *Caveat:* "Composition is not a silver bullet" (Duvall). The skill repo is a direct prior-art model for our SKILL.md.

### 7. Business logic and layering

**L1 · Modularizing React Applications with Established UI Patterns** — Juntao Qiu · martinfowler.com · 2023-02-16
<https://martinfowler.com/articles/modularizing-react-apps.html> · Q2, Q3, Q4, Q10
- "React is a humble library for building views". Layers: view / hooks / domain model / strategy / gateway.
- Move mapping, fallbacks, business rules into React-free domain objects/functions; gateway as anti-corruption layer for the API.
- Strategy pattern against scattered `if (country === …)`. Don't over-split cohesive components.

**L2 · Headless Component: a pattern for composing React UIs** — Juntao Qiu · 2023-11
<https://martinfowler.com/articles/headless-component.html> · Q2, Q3, Q10
- Hook owns state + behavior (ARIA, keyboard), renders nothing; testable on its own. Costs: indirection. Prefer mature libraries (Downshift, React Aria).

**L3 · Data Fetching Patterns in Single-Page Applications** — Juntao Qiu (with Martin Fowler) · 2024-05-29
<https://martinfowler.com/articles/data-fetch-spa.html> · Q4, Q10
- Async state handler hook; parallel fetching near the root to avoid waterfalls; keep the low-level `get` helper React-free.
- "Don't implement complex patterns like prefetching until they are clearly needed."

**L4 · Presentation Domain Data Layering** — Martin Fowler · 2015-08-26 · bliki
<https://martinfowler.com/bliki/PresentationDomainDataLayering.html> · Q3
- Layers narrow focus and give test seams; at scale, top level by **domain modules**, layers inside each.

**L5 · Clean Architecture on Frontend** / **Explicit Software Design** — Alex Bespoyasov · 2021 / 2023 series
<https://bespoyasov.me/blog/clean-architecture-on-frontend/> · <https://bespoyasov.me/blog/explicit-design-series/> · Q3, Q4, Q10
- Domain (entities + pure functions) ← application (use cases, ports) ← adapters (UI, API, storage); dependencies point inward.
- Use case = "impure sandwich" (effect → pure logic → effect); pass services as arguments, hook is the adapter.
- *Caveat (author):* costly, overkill for small apps; minimum = extracted domain + correct dependency direction.

**L6 · Client-Side Architecture Basics** — Khalil Stemmler · 2020
<https://khalilstemmler.com/articles/client-side-architecture/introduction/> (+ `/principles/`, `/layers/`) · Q3, Q4, Q5
- Layers: presentation, UI logic, container/page, interaction (use cases, business rules), networking, state.
- Command-Query Separation; vertical slices — "minimize coupling between slices, maximize coupling in a slice".
- *Caveat:* Apollo/GraphQL-centric, pre-RSC.

### 8. Data layer and state

**D1 · Practical React Query** — TkDodo · 2020-11, updated 2023-10 · blog
<https://tkdodo.eu/blog/practical-react-query> · Q4, Q5
- Server state in React Query, client state elsewhere; don't copy query data into `useState` (except seeding forms).
- Key is like a dependency array; keep `queryFn`, types and key together in `features/<f>/queries.ts`.
- *Caveat:* "always wrap `useQuery` in a custom hook" is superseded by D5/D6.

**D2 · Effective React Query Keys** — TkDodo · 2021-06, updated 2022-04
<https://tkdodo.eu/blog/effective-react-query-keys> · Q4, Q6
- Colocate keys per feature — rejects a global `src/utils/queryKeys.ts`. Generic → specific arrays; one key factory per feature.

**D3 · Leveraging the Query Function Context** — TkDodo · 2021-10, updated 2023-01
<https://tkdodo.eu/blog/leveraging-the-query-function-context> · Q4
- Read `queryFn` params from `queryKey` via context so keys can't drift; object keys for named, fuzzy invalidation.

**D4 · Type-safe React Query** — TkDodo · 2023-01, updated 2023-10
<https://tkdodo.eu/blog/type-safe-react-query> · Q4, Q7
- Don't pass generics to `useQuery`; type the `queryFn` return. Validate with Zod inside `queryFn`, infer types from the schema.

**D5 · The Query Options API** — TkDodo · 2024-01-17
<https://tkdodo.eu/blog/the-query-options-api> · Q4
- Define each query once with `queryOptions`; reuse across `useQuery`, `useSuspenseQuery`, `prefetchQuery`, `getQueryData`.
- "Separating QueryKey from QueryFunction was a mistake." Custom hooks are no longer the first choice.

**D6 · Creating Query Abstractions** — TkDodo · 2026-02-23
<https://tkdodo.eu/blog/creating-query-abstractions> · Q4
- `queryOptions` first — hooks only work in components/hooks and lock you into `useQuery`.
- "The best abstractions are not configurable": add `select`, `throwOnError` at the call site by spreading. `Partial<UseQueryOptions>` wrappers break inference.

**D7 · React Query and React Context** — TkDodo · 2023-07-22
<https://tkdodo.eu/blog/react-query-and-react-context> · Q4, Q5
- Fetch where needed; a provider may guarantee data for a subtree (hook throws outside it). Context = dependency injection, not state manager.

**D8 · React Query as a State Manager** — TkDodo · 2021-08-20
<https://tkdodo.eu/blog/react-query-as-a-state-manager> · Q5
- Share server data by calling the same query in many components; tune `staleTime`; never mirror into another store.

**D9 · Deriving Client State from Server State** — TkDodo · 2025-09-01
<https://tkdodo.eu/blog/deriving-client-state-from-server-state> · Q3, Q5
- Store only the user's choice (an ID); derive the effective value at read time (`selection ?? users?.[0]`) in a custom hook. Resetting effects are a smell.

**D10 · Working with Zustand** (2022-11) / **Zustand and React Context** (2024-04) — TkDodo
<https://tkdodo.eu/blog/working-with-zustand> · <https://tkdodo.eu/blog/zustand-and-react-context> · Q3, Q5, Q10
- Export only custom hooks with atomic selectors; separate `actions` object; actions as events; many small stores.
- Subtree/instance state: `createStore` inside a provider, passed through context (also isolates tests).

**D11 · Zustand: Practice with no store actions** — pmndrs · official docs
<https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions> · Q5
- Default: colocate actions with state; alternative: module-level actions calling `setState` (no hook needed, easier code-splitting).

**D12 · Redux Style Guide** — Redux team · official docs (reference point even without Redux)
<https://redux.js.org/style-guide/> · Q1, Q3, Q5
- Feature folders with single-file logic; put as much state logic as possible in reducers; actions as events; minimal state + memoized selectors; most form state isn't global.

**D13 · Application State Management with React** — Kent C. Dodds · 2020-07-21
<https://kentcdodds.com/blog/application-state-management-with-react> · Q3, Q5
- Server cache ≠ UI state; colocate; composition before context; several focused providers, accessed through custom hooks.

**D14 · State Colocation will make your React app faster** (2019-09-23) / **Don't Sync State. Derive It!** (2019-09-30) — Kent C. Dodds
<https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster> · <https://kentcdodds.com/blog/dont-sync-state-derive-it> · Q5
- Local → lift to common parent → context near consumers → global only for truly global state. Derive, don't sync.

**D15 · nuqs** — 47ng · tool docs
<https://nuqs.dev/> · <https://nuqs.dev/docs/server-side> · Q5, Q6
- Type-safe search-params state with a `useState`-like API; shared parser file (`searchParams.ts` from `nuqs/server`) reused by client hooks and server caches; test adapter.

**D16 · T3 Env** — t3-oss · tool docs
<https://env.t3.gg/docs/introduction> · <https://env.t3.gg/docs/nextjs> · Q6
- One `createEnv({ server, client, runtimeEnv })` in `src/env.ts` (or split server/client); server vars on the client throw; import in `next.config.ts` to validate at build.

### 9. Constants, enums and types

**K1 · Why I don't like TypeScript enums** — Matt Pocock · Total TypeScript · undated
<https://www.totaltypescript.com/why-i-dont-like-typescript-enums> · Q6
- Numeric enums accept any number; enums are nominal. "I wouldn't add an enum to a fresh codebase."

**K2 · erasableSyntaxOnly** — Matt Pocock · ~2025-01
<https://www.totaltypescript.com/erasable-syntax-only> · Q6
- Explains TS2 and why enums don't survive type stripping.

**K3 · Total TypeScript Essentials: Deriving types** — Matt Pocock · book
<https://www.totaltypescript.com/books/total-typescript-essentials/deriving-types> · Q6
- "If I were starting a project today, I would use `as const` instead of enums."

**K4 · Where To Put Your Types in Application Code** — Matt Pocock · undated
<https://www.totaltypescript.com/where-to-put-your-types-in-application-code> · Q7
- Inline/colocate single-use types; shared types in `*.types.ts` at the smallest scope covering all users; monorepo → types package.

**K5 · Tidy TypeScript: Prefer union types over enums** — Stefan Baumgartner · 2020-11 (updated for TS 5.0)
<https://oida.dev/tidy-typescript-avoid-enums/> · Q6
- Prefer string literal unions (no emitted code, map to backend strings); `as const` object as the fallback when runtime values are needed.

### 10. Barrel files

**BF1 · Please Stop Using Barrel Files** — TkDodo · 2024-07-26
<https://tkdodo.eu/blog/please-stop-using-barrel-files> · Q8
- Barrels cause cycles and load everything; one Next.js app dropped from ~11k to ~3.5k modules after removing them.
- Only a library's single entry point justifies a barrel; enable `import/no-cycle`.

**BF2 · Speeding up the JavaScript ecosystem — The barrel file debacle** — Marvin Hagemeister · 2023-10-08
<https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/> · Q8
- Modules aren't loaded lazily; test runners pay per file; removing barrels made tasks 60–80% faster.

**BF3 · How we optimized package imports in Next.js** — Shu Ding (Vercel) · 2023-10-13
<https://vercel.com/blog/how-we-optimized-package-imports-in-next-js> · Q8
- `optimizePackageImports` for npm package barrels: 15–70% faster dev, ~28% faster builds. Not for your own internal barrels.

**BF4 · How We Achieved 75% Faster Builds by Removing Barrel Files** — Tim Sebastian (Atlassian) · 2025-06-26
<https://www.atlassian.com/blog/how-we-build/faster-builds-when-removing-barrel-files> · Q8
- Jira: TS highlighting >30% faster, tests ~50% faster, build minutes −75%. Accepted trade-off: packages lose a tidy public API.

**BF5 · Vercel `react-best-practices` agent skill — rule `bundle-barrel-imports`** — Vercel Labs · 2026-01
<https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/rules/bundle-barrel-imports.md> ·
announcement <https://vercel.com/blog/introducing-react-best-practices> · Q8
- CRITICAL: "Avoid Barrel File Imports"; in Next.js use `optimizePackageImports`, else deep imports. Some deep paths lose types.

### 11. Enforcement tooling

**E1 · eslint-plugin-boundaries** — Javier Brea · v7.2.0
<https://github.com/javierbrea/eslint-plugin-boundaries> · docs <https://www.jsboundaries.dev/docs/overview/> · Q9
- Classify files into elements, allow/deny dependencies between them; flat config.
- v7: canonical rule `boundaries/dependencies`; `element-types`, `entry-point`, `external`, `no-private` are deprecated.

**E2 · `import/no-restricted-paths`** — eslint-plugin-import / import-x
<https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md> ·
<https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-restricted-paths.md> · Q9
- `zones[]` with `target`/`from`/`except`/`message`; matches resolved paths. The mechanism Bulletproof uses.

**E3 · dependency-cruiser** — Sander Verweij · v18.6.0
<https://github.com/sverweij/dependency-cruiser> · rules <https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md> · Q9
- `forbidden`/`allowed`/`required` rules; group matching expresses "no cross-feature imports" in one rule; circular/orphan detection; graph output.

**E4 · Steiger** — feature-sliced · v0.7.0 (beta)
<https://github.com/feature-sliced/steiger> · Q9
- FSD linter: `fsd/forbidden-imports`, `fsd/public-api`, `fsd/no-public-api-sidestep`, `fsd/insignificant-slice`, `fsd/segments-by-purpose`.

**E5 · `server-only` / `client-only`** — React team, handled by Next.js
See N4, N6 · Q9
- Marker imports that fail the build when a module lands in the wrong environment.

**E6 · Knip** — webpro · v6.42.0
<https://knip.dev/> · Next plugin <https://knip.dev/reference/plugins/next> · Q9
- Unused files, exports, dependencies; Next plugin treats `app/**/{page,layout,route,…}` as entries. Fix top-down; `ignore` as last resort.

**E7 · `@nx/enforce-module-boundaries`** — Nx
<https://nx.dev/docs/features/enforce-module-boundaries> · Q9
- Tag-based `depConstraints` between projects — monorepo/package level, not folders inside one app.

**E8 · Naming linters** — eslint-plugin-check-file / unicorn
<https://github.com/dukeluo/eslint-plugin-check-file> · <https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md> · Q8, Q9
- check-file: `filename-naming-convention`, `folder-naming-convention`, `no-index` (flat config only from v3).
- unicorn `filename-case`: default kebab-case; `cases` allows mixing (kebab + Pascal).

### 12. Testing

**TE1 · Testing Implementation Details** — Kent C. Dodds · 2020-08-17
<https://kentcdodds.com/blog/testing-implementation-details> · Q10
- Two users: end user and developer. Test via props and rendered output, not internal state.

**TE2 · How to test custom React hooks** — Kent C. Dodds · 2020-03-22
<https://kentcdodds.com/blog/how-to-test-custom-react-hooks> · Q10
- Default: test the hook through a realistic component; `renderHook` for complex hooks.

**TE3 · Stop mocking fetch** — Kent C. Dodds · 2020-06-03
<https://kentcdodds.com/blog/stop-mocking-fetch> · Q10
- Don't mock `fetch` or the API client module; use MSW handlers so the real client code runs.

---

## Consensus

1. **Colocate by default; promote on real reuse.** Code, tests, styles, types, constants and hooks live next to their only consumer and move to
   shared only when 2+ consumers need them (S1, S3, S9, K4, F5, R14, D2).
2. **Group by domain/feature at scale** ("screaming architecture"), with shared UI primitives kept separate (S7, B1, F1, S3, S5, S6, S9).
   Notable dissent: S2.
3. **Dependencies flow one way** — shared → features/domain → app/pages/routes. Features don't import each other; compose them at the page
   (B1, F1, S3, S4).
4. **Each module exposes a deliberate public surface**; aliased imports across modules, relative inside (F3, S5, A2, S9).
5. **Split on concrete signals**, not by file length: own state, nameable responsibility, client boundary, mutually exclusive render states,
   existing reuse. Duplication beats the wrong abstraction (R1, R3, C4–C6, C10, C16).
6. **Hooks are the default logic-reuse tool**; HOCs, render props for logic and HOC-based containers are legacy (C1, C11, R3).
   Pure calculations live in plain TS functions outside components (L1, L5, R2, R3).
7. **Composition over configuration**: props → `children`/slots → compound components → context; avoid mode-switching booleans
   (R7, R8, C2, C7, C8, C17, R5).
8. **Server state stays in TanStack Query**; client state is minimal and derived at read time; the URL holds shareable state
   (D1, D8, D9, D13, T3, T6, R4, R5).
9. **One definition per query** — `queryOptions` + a per-feature key factory, colocated, not in a global keys file (D2, D5, D6, T1, N9).
10. **Validate at trust boundaries** (API responses, env, search params) and infer types from schemas (D4, D16, T6, N6).
11. **Next.js specifics**: thin route files, `'use client'` on leaves, a `server-only` DAL for server data and env (N4–N6, F4).
12. **`as const` objects or string unions over `enum`** in new code (TS1, TS2, K1, K3, K5).
13. **Avoid internal barrels** (or at least `export *` and giant shared barrels) (BF1–BF5, B1, A2).
14. **Enforce structure with tools, not wiki pages** (E1–E4, E6, B1).

## Disagreements and proposed stance

| Topic | Positions | Proposed stance for SKILL.md |
|-------|-----------|------------------------------|
| Barrel / index files | Against: BF1–BF5, B1, A2; S3 "optional". Public-API index: F3, S5, S6. Defends in app code: S2 | Per-component / per-feature `index.ts` allowed as the public API; never `export *`; no single giant shared barrel; `optimizePackageImports` for npm packages only |
| Feature vs type-based folders | Feature: B1, F1, S3, S5–S7, S9. Function-based: S2. Neutral: R14, N1 | Feature/route-based at app level; type-based only inside a feature or the shared UI library |
| Segment names | `components/ hooks/ types/ api/` (B1) vs purpose names `ui/ model/ api/ lib/ config/` (F2) vs `feature.type.ts` suffixes (S12) | Pick one per repo and lint it; keep a repo's existing convention |
| Feature code inside `app/` | Inside `_components`/`_lib`: N1 strategy 3, S12, B1 Next app. Outside `app/`: S3, F4, N1 strategy 1 | Page-private code in `_components/`; once a second route needs it, move it to `src/components/` or a feature folder |
| Business logic: hooks vs pure modules | Pure domain modules, hooks as adapters: L1, L5, D12. Logic in hooks/store actions is fine: D9, D10, D13. Interaction layer: L6 | Hooks orchestrate (read query/store/URL state, call functions); rules are pure functions in `helpers.ts` / domain modules, unit-tested without `renderHook` |
| Custom query hooks vs `queryOptions` | Hook per request: B1, D1 (2020). `queryOptions` first: D5, D6, T1, N9 | `queryOptions` + key factory first; thin hooks on top only where they add value |
| `lib` vs `utils` vs `helpers` | `lib` = configured 3rd-party wrappers, `utils` = shared pure fns (B1, S3). `utils` = generic/portable, `helpers` = project-specific (S2). `lib` = focused internal libraries (F2). No meaning (N1) | `lib/` = infra and configured wrappers (API client, query client, formatters); `helpers` = project-specific pure functions; `utils` = generic, portable code. Avoid catch-all dumps |
| Global `constants/`, `types/` vs colocated | Global + local: B1, S2. Colocate, no catch-alls: S9, S1, K4, F2 | Colocate; root level only for truly cross-cutting items (env schema, route constants, design tokens) |
| Split early vs late | Early ("if it grows, decompose"): R1, C12. Late ("NOT BEFORE"): C5. Over-splitting warning: L1 | Extract on a concrete signal (own state, nameable responsibility, client boundary, exclusive states); not just to shorten a file |
| Container / presentational | Retracted as dogma: C1; replaced by hooks: C11; principle "still applies": C11 (react-2026) | Separate data/side effects from rendering where natural — in Next.js: Server Component fetches → Client leaf renders. Not a mandatory folder split |
| Compound components vs RSC | Recommended: C8, C11, C17. Static members break across the boundary: N5 | Use named exports for compound parts consumed from Server Components |
| Context use | Last resort: R7. Keep providers near consumers: D14, N4. DI interface for compound families: C17, D7 | Context for dependency injection inside a component family or subtree; not an app-wide prop shortcut |
| Atomic Design | Mental model, not folders: C12. Critiques: practitioners | Vocabulary only; never as app folder layout |
| Prop count | No authoritative number (R7 "a dozen props… not unusual"; B1 "too many props → split") | Any limit is our heuristic — state it as such |
| Enum replacement | `as const` objects: K1, K3. String unions first: K5. Neutral: TS1 | String unions for types; `as const` object when runtime values are needed; never `enum` |
| URL state | Per-hook (nuqs, D15) vs route-level schema (T6) | One shared parser/schema module per route |
| Testing hooks | Through components: TE2, B1. Directly with `renderHook`: L2, T5 | Pure functions → unit tests; hooks → through components by default, `renderHook` for complex ones |

## Unverified and failed URLs

| URL | Status |
|-----|--------|
| `https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0` (and `dan-abramov.medium.com/…`) | HTTP 403; read via readmedium.com mirror; only the 2019 sentence confirmed verbatim |
| `https://profy.dev/article/react-folder-structure` | DNS ENOTFOUND; dev.to mirror used (S5) |
| `https://feature-sliced.design/blog/v2-1` | 404; v2.1 content verified at F5 |
| `https://feature-sliced.design/docs/reference/isolation` | Empty content |
| `https://www.reactuniverseconf.com/talks/composition-is-all-you-need` | SSL failure; abstract known from search snippets only |
| `https://www.youtube.com/watch?v=4KvbVq3Eg5w` | Title confirmed; date (~2025-09-08) from a third-party list |
| Dan Abramov's "move files around" tweet | Not verified; only the surge page (S8) |
| `https://www.qt.io/blog/atomic-design-systems-why-the-labels-dont-matter` | Seen in search only, not fetched |
| `https://martinfowler.com/tags/front-end.html`; Fowler-site "Refactoring with Codemods" (2025-01) | Seen in search only, not fetched |
| `https://zustand.docs.pmnd.rs/guides/practice-with-no-store-actions` | 404 — use the `/learn/guides/…` URL (D11) |
| `https://tkdodo.eu/blog/thinking-in-react-query` | Loads, but talk slides could not be extracted; not used |
| `https://kentcdodds.com/blog/full-stack-components` | 404; not used |
| `https://engineering.unkey.com/rfcs/0007-client-file-structure` | DNS ENOTFOUND; not used |
| Total TypeScript pages (K1, K3, K4) | No visible publication dates |
| TanStack Query docs | No official page on custom-hook guidance — that guidance comes from TkDodo (D5, D6) |
| Kent C. Dodds Epic React "Advanced React Patterns" workshop | No URL verified |
| Nx `type:feature/ui/data-access/util` tag taxonomy | Not shown on the verified E7 page |
