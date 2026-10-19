---
name: frontend-architecture
description: "Frontend architecture for React 19 / Next.js App Router + TanStack Query + TypeScript apps: decides WHERE code goes and HOW it is split. Use when creating, moving, splitting or reviewing components, hooks, helpers, utils, constants, types, API/query code or state; when unsure whether to extract a component, hook or helper; or when a folder layout, index/barrel file, import path or module boundary is in question. Covers folder structure, component decomposition and composition, business-logic placement, data layer, state placement, constants and config, utils vs helpers vs lib, public APIs, barrels, naming and lint enforcement. Hook/state anti-patterns live in react-best-practices; Next.js APIs in next-best-practices."
---

# UI Architecture — where code goes

Rules for placing, splitting and connecting frontend code. Each section ends with source IDs from the
[source catalog](README.md). Code samples: [examples.md](examples.md). Lint setups: [enforcement.md](enforcement.md).

**Project conventions win.** If the repo documents its own frontend conventions (`AGENTS.md`, `CLAUDE.md`, an
architecture doc), read them first. Where they differ from a rule here, follow the repo and don't restructure
existing code unprompted. Use this skill to fill gaps and to judge new cases.

## Severity levels

Same scale as [react-best-practices](../react-best-practices/SKILL.md), for consuming agents:

- **CRITICAL** — causes bugs, leaks server code or secrets, or creates coupling that is expensive to undo
- **HIGH** — causes scaling, performance or "where does this go?" problems
- **MEDIUM** — hurts consistency, discoverability or developer experience

---

## Core principles

1. **Colocate by default.** Code lives next to its only consumer: the component plus its hooks, helpers, constants, types, styles and tests.
2. **Promote on the second real consumer, not "just in case".** Move code to the *smallest* scope that covers every consumer.
3. **Dependencies flow one way:** shared → features → app/routes. Never upward, and never sideways between features.
4. **Every module has a deliberate public surface.** Consumers import that surface and never reach into the module's internals.
5. **Duplication beats the wrong abstraction.** When shared code grows a flag or branch per caller, inline it back and re-extract.
6. **Structure grows with the app.** Add layers (features/, domain modules, a DAL) only when code exists to fill them.
7. **One convention per repo, enforced by tooling.** A rule that only lives in a wiki will drift.

Sources: S1, S3, S7, S9, B1, F1, F3, F5, C4, C6, C10, R14.

## Where does X go?

| You have… | Put it… | Not… |
|-----------|---------|------|
| A component used by one route | `app/<route>/_components/<Name>/` | `src/components/` "for later" |
| A component used by 2+ routes or features | the nearest shared place: `src/components/<Name>/` or `src/features/<f>/components/` | a deep relative import into another route's `_components/` |
| A generic UI primitive (Button, Dialog, Tabs) | the design system / `components/ui` | inside a feature |
| A pure rule, calculation or mapping on domain data | `helpers.ts` next to its consumer; a feature/domain module once it is shared | the component body, a `useEffect`, a "hook" that calls no hooks |
| Stateful logic that wraps an Effect, a subscription or an external system | a custom hook `useX.ts` next to its consumer | a lifecycle wrapper like `useMount` |
| An HTTP request | the configured client in `lib/` plus the feature's query module (`queryOptions` + key factory) | `fetch` inside a component |
| Data that came from the server | the TanStack Query cache | copies in `useState`, context or a store |
| Shareable view state (tab, filter, selected id, page) | URL search params, parsed in one place per route | local state, if it must survive a reload or a shared link |
| Ephemeral UI state (open, hover, draft input) | `useState` in the lowest component that needs it | a global store |
| A constant used by one module | the top of that file, or a sibling `constants.ts` | a global `constants/` folder |
| Env and app config | one schema-validated `env.ts`; server vars only in `server-only` modules | `process.env` scattered across files |
| A type used once | inline, next to its use | a global `types/` folder |
| An API contract type | inferred from the schema or the shared contract package | a hand-copied interface |
| A configured third-party wrapper (API client, QueryClient, i18n) | `lib/` | `utils/` |
| A generic, project-agnostic function (`clamp`, `groupBy`) | `utils/`, or an existing library | `helpers` |
| UI copy | the i18n messages files | a constant |
| A unit test | next to the file it tests | a parallel `__tests__/` tree (e2e is the exception) |

---

## 1. Folder structure (HIGH)

- **Grow in stages:** single file → several files → a folder per component → shared technical folders → `features/`.
  Restructure when the current shape hurts, not before. Avoid deep nesting (about 3–4 folder levels inside a feature).
- **App Router: `app/` is the routing layer.** A route file reads params, composes components and renders them. It
  holds no business logic, no data mapping and no large JSX.
- **Page-private code goes in private folders** next to the route: `_components/`, `_lib/`. Private folders and
  `(route-groups)` organize code without changing URLs. Everything else under `app/` is a routing decision.
- **Shared code lives outside `app/`:** `src/components/` (UI used app-wide), `src/lib/` (infrastructure),
  `src/hooks/` (generic hooks) and, once the app has several domains, `src/features/<feature>/`.
- **A feature folder contains only the subfolders it needs**, for example `components/`, `hooks/`, `api/` or
  `queries.ts`, `helpers.ts`, `constants.ts`, `types.ts`. Don't create empty scaffolding.
- **Organize the top level by domain or feature as the app grows**, not by file type. Type-based folders are fine
  inside a feature or a shared UI library.
- **Atomic Design levels (atoms, molecules, organisms) are vocabulary, not folders.** Placement becomes ambiguous and
  components get hard to find.

Sources: N1, N3, R14, S3, S4, S7, S9, B1, F1, F4, F5, C12.

## 2. Component decomposition (HIGH)

### Split when there is a concrete signal
- **A piece owns state that only part of the tree needs:** move that state down into a smaller component.
- **A piece is interactive inside a mostly static tree:** extract the client leaf (see section 4).
- **It renders mutually exclusive states** (loading, empty, error, data) as nested ternaries: use early returns,
  with the shared shell extracted as a `Layout` component that takes `children`.
- **A piece has a responsibility you can name** or maps to one piece of the data model.
- **Real reuse exists** (2+ consumers today). Anticipated reuse doesn't count.
- **It needs isolated tests, wraps an imperative or third-party API, or keeps causing merge conflicts.**
- **There are `renderX()` helper functions inside the component body:** make them real components.

### Don't split when
- **The only goal is a shorter file.** Long declarative JSX is fine.
- **The extracted piece would need most of the parent's props passed through.** Compose with `children` instead.
- **Reading one behavior would mean jumping through many tiny files.**

### Component file hygiene
- **One exported component per file, named like the file.** Small private subcomponents may share the file.
- **Components are pure.** Helpers and constants live outside the component body.
- **Order inside a file:** imports → constants → types → helpers → component → exports.
- **Size and prop count are review prompts, not rules.** No source sets a hard number. Past roughly 200 lines or
  7 props, look for a split or a composition point. Don't split by line count alone.

Sources: R1, R2, R10, R11, C2, C5, C16, L1, B1.

## 3. Composition and component APIs (HIGH)

- **Escalate in this order:** props → `children` and slots → compound components → context. If a middle component
  only forwards props, pass JSX as `children` instead.
- **Lift content up.** A wrapper that holds state takes the expensive or static subtree as `children`.
- **Booleans:** independent toggles (`disabled`, `fullWidth`) are fine. Booleans that switch modes (`isThread`,
  `isEditing`) or can form invalid combinations must become explicit variant components, a `variant` union, or
  composition.
- **Compound components:** the parent holds state in context, and the parts read it through a hook that throws
  outside the provider. When the parts are used from Server Components, export each part by name (`MenuItem`).
  Static members like `Menu.Item` break across the server/client boundary.
- **Polymorphism uses `asChild`/`Slot` or a `render` prop**, not a growing `as` prop. The receiving component spreads
  props onto its DOM node and accepts `ref` (in React 19, `ref` is a plain prop).
- **Complex controls (combobox, menu):** use a headless hook or library such as Downshift, React Aria, Radix or Base UI.
  Don't hand-roll one.
- **Render props and HOCs for sharing logic are legacy.** Use a custom hook.
- **Container/presentational is not a mandatory split.** Separate data and side effects from rendering where it is
  natural. In the App Router, a Server Component fetches and a client leaf renders.
- **State ownership:** controlled components give flexibility, uncontrolled ones are easier to use. A prop that seeds
  state is named `initialX` or `defaultX`.

Sources: R5–R8, R13, C1, C2, C7, C8, C11, C13, C15, C17, L2, N5.

## 4. Server/Client boundary — Next.js App Router (CRITICAL)

- **Server Components by default.** Put `'use client'` at the entry of an interactive subtree, on the smallest leaf
  file that needs hooks, events or browser APIs. Everything that file imports joins the client bundle.
- **Pass server-rendered content into client components** through `children` or other props.
- **Providers live in one client `providers.tsx`, rendered as deep as possible.** A TanStack `QueryClientProvider`
  goes in the nearest shared layout.
- **Pure modules carry no directive.** Helpers, constants, styles and query options can then be imported from both
  sides.
- **Modules that touch secrets, the database or a DAL start with `import 'server-only'`.** A wrong import becomes a
  build error instead of a leak.
- **Props crossing the boundary must be serializable.** Pass data, not class instances or functions; Server
  Functions are the exception.
- **A client-driven app is a valid choice**, for example screens built on TanStack Query and `useSearchParams`, with
  `'use client'` pages. Keep the route file thin anyway, and keep pure modules free of the directive.

Sources: N4, N5, N6, N9, S10.

## 5. Business logic (CRITICAL)

- **Rules, calculations, mapping and formatting are pure TS functions with no React import.** They live in
  `helpers.ts` next to their consumer, and move into a feature or domain module once shared.
- **Hooks orchestrate; pure functions decide.** A hook reads query, URL or store state, calls pure functions and
  returns values and handlers. The rule itself stays testable without `renderHook`.
- **A function that calls no hooks is not a hook.** Name it `getX`, `computeX` or `formatX`, not `useX`.
- **Interaction logic lives in event handlers, not Effects.** Several handlers share it through a plain function.
- **Derive, don't sync:** compute from minimal state during render. Details are in react-best-practices.
- **Variant logic scattered across components** (`if (provider === "x")` in five places) becomes one strategy map in
  one module.
- **Map API DTOs into UI-ready shapes at the data-layer boundary** (the query function or `select`), not inside JSX.
- **Complex local state transitions go in a reducer:** pure, exported, tested in isolation, with actions named after
  what the user did.
- **Security-relevant validation and authorization live on the server.** Client-side validation is UX.
- **Don't build Clean-Architecture layers (use cases, ports, adapters) for a CRUD screen.** The minimum is extracted
  domain functions and the right dependency direction.

Sources: L1, L4, L5, L6, R3, R4, R9, D9, N6.

## 6. Data layer (HIGH)

- **One transport module:** a configured client (base URL, headers, a typed error) in `lib/`. Components never call
  `fetch` directly.
- **One query module per feature:** `queryOptions` definitions plus a key factory. Export the options, and add thin
  hooks on top only where they add value. Hooks can't run in loaders, servers or prefetch paths; options can.
- **Query keys** are arrays ordered from generic to specific and include every variable the query function uses.
  Build them from one factory per feature, colocated with its queries. Never use a global keys file.
- **Don't make query abstractions configurable.** Add `select`, `enabled` or `throwOnError` at the call site by
  spreading the shared options.
- **Validate responses at the trust boundary** (a schema parse inside the query function) and infer types from the
  schema. Avoid return-only generics like `get<T>()`.
- **Mutations invalidate through the factory keys.** Keep invalidation next to the query definitions, not scattered
  across components.
- **QueryClient defaults (`staleTime`, retries, error toasts) are set once**, in the providers module.
- **Next.js server data uses one approach.** For new code that is a Data Access Layer: `server-only`, authorization
  checks, minimal DTOs, thin `'use server'` actions that delegate to it. Only the DAL reads `process.env`.
- **Avoid waterfalls:** fetch at the route level or in parallel (`Promise.all`, prefetch), not in nested children
  one after another.

Sources: B1, D1–D6, D8, T1–T4, N6, N8, N9, L3.

## 7. State placement (HIGH)

Walk the ladder top-down and stop at the first match:

1. **Can it be computed** from props, state or server data? Derive it and store nothing.
2. **Is it server data?** It belongs in the TanStack Query cache. Never copy it into `useState`, context or a store.
3. **Should it survive a reload or a shared link** (tab, filter, selected id, pagination)? Use URL search params,
   parsed and validated in one place per route.
4. **Does only one component use it?** `useState` there.
5. **Do siblings need it?** Lift it to the closest common parent.
6. **Does a deep subtree need it?** Try composition first, then context with the provider close to its consumers.
7. **Is it truly app-wide client state** (theme, toasts, current user)? Use a small focused context or store.

- **Store the user's choice (an id), derive the effective value** (`selection ?? items[0]`). An Effect that "resets"
  state when data changes is a smell.
- **Form state stays local** or inside the form library.
- **Context is for dependency injection, not a state manager.** Split contexts by concern.

Sources: R4–R7, R9, D7–D15, T3, T6, N12, B1.

## 8. Constants and config (MEDIUM)

- **Colocate constants at the narrowest scope:**
  - used in one module → top of that file;
  - used across one component folder → `constants.ts` beside it;
  - used across a feature → the feature's `constants.ts`;
  - only truly cross-cutting values (route paths, design tokens, env) go global.
- **Naming:** module-level immutable values use `UPPER_SNAKE_CASE`. Use `as const` (or `satisfies`) to keep literal
  types.
- **No `enum` in new code.** Use a string-literal union for a type. When runtime values are also needed, use an
  `as const` array or object and derive the type: `type Level = (typeof LEVELS)[number]`.
- **Magic numbers and strings in logic become named constants next to that logic** (thresholds, durations, limits).
- **UI copy is not a constant.** It goes in the i18n messages.
- **Env is validated once** with a schema in `env.ts`. Server variables are read only from `server-only` modules.
  `NEXT_PUBLIC_*` values are inlined at build time, so they cannot change at runtime.
- **Query keys are not global constants.** They live with their feature's query definitions (section 6).

Sources: S2, S9, F2, TS1, TS2, K1, K3, K5, N6, N10, D2, D16.

## 9. utils vs helpers vs lib, hooks, types (MEDIUM)

No source agrees on these names. This skill uses the following definitions:

- **`helpers`**: project-specific pure functions that know the domain (`isOverdue`, `formatPrice`). They sit
  next to their consumer and get promoted when shared.
- **`utils`**: generic, project-agnostic pure functions (`clamp`, `groupBy`) that could be copied into another
  project. Check for an existing library first.
- **`lib/`**: configured infrastructure and third-party wrappers, such as the API client, QueryClient and providers,
  i18n setup, and cross-app formatters.
- **`hooks/`**: shared hooks only. A component-specific hook sits with its component.
- **No catch-all files.** Split a `utils.ts` or `helpers.ts` full of unrelated functions by topic, and delete
  orphaned functions.
- **Types:** keep them inline or colocated. A shared type goes in a `types.ts` at the smallest scope that covers every
  user. Contract types come from schemas or the shared contract package. No global `types/` dump.
- **Pure modules import no React and have no `'use client'`**, so they can be tested without a DOM.

Sources: B1, S2, S3, F2, K4, S1, S9.

## 10. Module boundaries, public API, barrels, imports (HIGH)

- **A component or feature folder exposes its public API through `index.ts` with explicit named re-exports.**
  Consumers import only from that index.
- **Never use `export *` in app code**, and never build one giant shared barrel. Don't add an index to a folder that is
  not a module, like a `hooks/` folder re-exporting everything. Barrels load the whole graph and cause import cycles.
- **Use relative imports inside a module and the alias (`@/…`) across modules.** Deep `../../../` chains between
  modules are a smell.
- **Features don't import each other.** Compose them at the page or route. Code needed by 2+ features moves down to
  shared.
- **Don't deep-import into another module's internals** (`../../other-route/_components/X/helpers`). Promote the code
  instead.
- **Import cycles are bugs.** Catch them with `import/no-cycle`.
- **For npm packages with big barrels**, use `optimizePackageImports` in Next.js or deep package paths.
- **Naming:** follow the repo's file and folder case convention and lint it. A file is named after its main export.
  Hooks are `useX`, components `PascalCase`.

Sources: F3, S2, S5, B1, BF1–BF5, A2, N11, R10, E8.

## 11. Enforcement (MEDIUM)

Prefer one boundary tool and turn its rules on gradually:

- **Feature isolation and one-way dependencies:** `import/no-restricted-paths` zones or `eslint-plugin-boundaries`;
  use `dependency-cruiser` for regex and group rules.
- **Import cycles:** `import/no-cycle`. **Unused files and exports:** Knip, which has a Next.js plugin.
- **File and folder naming:** `eslint-plugin-check-file` or `unicorn/filename-case`.
- **Environment leaks:** `server-only` / `client-only` imports.

Ready-to-adapt configs are in [enforcement.md](enforcement.md).

Sources: E1–E8, B1.

## 12. Testability (MEDIUM)

- **Pure helpers get unit tests next to the file**, with no React involved.
- **Components are tested through rendered behavior**, not internal state. See the react-testing-library skill.
- **Hooks are tested through a component by default.** Use `renderHook` for complex hooks, with a fresh QueryClient
  per test and retries off.
- **Mock the network** (MSW or a mocked fetch at the transport), not your own API client module.
- **Hard to test means wrongly placed:** extract the rule into a pure function.

Sources: TE1–TE3, T5, R9, L1, L2.

---

## Review checklist

- [ ] Every new file sits next to its only consumer, or 2+ consumers justify its move to shared.
- [ ] No import reaches into another route's `_components/` or another feature's internals.
- [ ] No new `export *`; cross-module imports go through the module's `index.ts`.
- [ ] Component bodies hold no business rules, data mapping or `fetch`; rules are pure helpers.
- [ ] No `useX` that calls no hooks; no Effect computing derivable state.
- [ ] Server data is not copied into local state; query keys come from the feature's key factory or definitions.
- [ ] Shareable view state is in the URL and parsed in one place.
- [ ] Constants are named, colocated and `as const`; no `enum`; no hardcoded UI text.
- [ ] `'use client'` appears only on files that need it; pure modules have no directive.
- [ ] Mode-switching booleans are variants or composition.
- [ ] Server-only modules import `server-only`; env is read through the validated `env` module.

## Related skills

- [react-best-practices](../react-best-practices/SKILL.md) — hooks, derived state, memoization, effects
- [next-best-practices](../next-best-practices/SKILL.md) — App Router file conventions, RSC boundaries, data patterns
- [react-testing-library](../react-testing-library/SKILL.md) — how to test what this skill places
- [zod](../zod/SKILL.md) — schemas at trust boundaries · [typescript-expert](../typescript-expert/SKILL.md) — type-level details
