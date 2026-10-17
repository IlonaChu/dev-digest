# client — @devdigest/web

Next.js studio (:3000) talking to the API on :3001. UI route map: [README.md](README.md)

## Commands (run in client/)
```sh
pnpm dev          # next dev -p 3000
pnpm typecheck
pnpm test         # vitest + jsdom + React Testing Library; fetch is mocked
```

## Where things live
- `src/app/` — App Router pages (`onboarding`, `repos/[repoId]/pulls/[number]`, `agents`, `settings`)
- `src/lib/api.ts` + `src/lib/hooks/` — API calls via TanStack Query
- `src/components/` — app-wide components
- `src/vendor/ui/` — design-system primitives; see its [README.md](src/vendor/ui/README.md)
- `src/vendor/shared/` — COPY of the server's Zod contracts
- `messages/en/<namespace>.json` — all UI strings

## Conventions
- A component is a folder: `X.tsx` · `styles.ts` · `constants.ts` · `helpers.ts` · `index.ts`.
  Page-private components live in a sibling `_components/`.
- No hardcoded UI text: add keys to `messages/en/<ns>.json`, read via `useTranslations("<ns>")`.
- Aliases: `@/` = `src/`, `@devdigest/shared`, `@devdigest/ui` (defined in tsconfig AND vitest.config.ts).

## Gotchas
- `src/vendor/shared` is not the canonical contract: change `server/src/vendor/shared` first,
  then mirror here. The copies already differ.

## Docs
[docs/](docs/README.md) · [specs/](specs/README.md) · [INSIGHTS.md](INSIGHTS.md)
Skills: next-best-practices · react-best-practices · react-testing-library
