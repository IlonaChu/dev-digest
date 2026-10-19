# External adapters — SDKs, processes, filesystem

Everything that leaves the process lives in `server/src/adapters/<name>/`, implements a port, and is chosen in
`platform/container.ts`. That is what lets tests run hermetically with doubles and lets a provider be swapped
without touching modules.

## Current map

| Outside world | Port | Adapter | Test double |
|---|---|---|---|
| LLM chat/structured (OpenAI, Anthropic, OpenRouter) | `LLMProvider` | `adapters/llm/openai.ts`, `anthropic.ts`; `OpenRouterProvider` from reviewer-core `src/llm/` | `MockLLMProvider` |
| Embeddings | `Embedder` | `adapters/embedder/openai.ts` | `MockEmbedder` |
| GitHub API | `GitHubClient` | `adapters/github/octokit.ts` | `MockGitHubClient` |
| git working copies | `GitClient` | `adapters/git/simple-git.ts` | `MockGitClient` |
| Code search | `CodeIndex` | `adapters/codeindex/ripgrep.ts` | `MockCodeIndex` |
| Auth / tenancy | `AuthProvider` | `adapters/auth/local.ts` | `MockAuthProvider` |
| Secrets | `SecretsProvider` | `adapters/secrets/local.ts` | `MockSecretsProvider` |
| Import graph (dependency-cruiser) | `DepGraph` | `adapters/depgraph/index.ts` | override |
| Token counting (js-tiktoken) | `Tokenizer` | `adapters/tokenizer/index.ts` | override |
| AST parsing (ast-grep) | — (legacy: imported directly by repo-intel) | `adapters/astgrep/index.ts` | — |

## Adding an integration — the checklist

1. **Port first.** Write the interface for what the core needs (`ports.md`): shared → `vendor/shared/adapters.ts`
   (+ client mirror), module-private → `modules/<m>/ports.ts`.
2. **Adapter** in `src/adapters/<name>/<impl>.ts`, `implements` the port. Translate SDK types into port types and
   SDK errors into `ExternalServiceError` / `ConfigError`. Wrap outbound calls with `withTimeout` / `withRetry`
   from `platform/resilience.ts`.
3. **Secrets** only via `SecretsProvider` inside the Container getter (`await this.secrets.get('X_API_KEY')`);
   missing key → `ConfigError` at resolve time, so the app still boots with zero keys.
4. **Container**: lazy getter (async if it needs a secret), memoised; clear it in `invalidateSecretCaches()` if it
   caches a secret-backed client; add a field to `ContainerOverrides`.
5. **Double** in `src/adapters/mocks.ts`: deterministic, no network, no keys.
6. **Barrel**: export the adapter from `src/adapters/index.ts`.
7. **Guard**: add the SDK's package name to `IO_SDKS` in `server/.dependency-cruiser.cjs` so an import outside
   `src/adapters/` fails `pnpm arch:check`.

## Node I/O and environment

- `fs`, `fs/promises`, `child_process`, `net`, `http(s)` are adapter/infrastructure concerns. Modules read files
  through a port (`GitClient.readFile(repo, path)`, `CodeIndex`) — checked by `node-io-only-in-infrastructure`.
  Legacy: the `repo-intel` service and pipeline read the clone with `fs` directly.
- `process.env` is read only in `platform/config.ts`, `adapters/secrets/local.ts`, other adapters that configure
  their own subprocesses (`simple-git` sets `GIT_TERMINAL_PROMPT`), and the `db/seed.ts` / `db/migrate.ts`
  CLIs — checked by `server/test/architecture.test.ts`.

## Adapters stay dumb about features

An adapter imports ports, contracts and its SDK — never `src/modules/*` (checked:
`adapters-do-not-know-features`). If it needs a feature constant (supported extensions, limits), take it as a
constructor/method argument or move the constant into the shared kernel. Legacy: `astgrep` and `depgraph`
import `modules/repo-intel/constants.ts`.
