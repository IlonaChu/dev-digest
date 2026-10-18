/**
 * Onion Architecture guard for server/ — the import rules behind the
 * `onion-architecture` skill (.claude/skills/onion-architecture/).
 *
 *   pnpm arch:check     → fails on any violation NOT in the baseline
 *   pnpm arch:baseline  → rewrites .dependency-cruiser-known-violations.json
 *                         (only to SHRINK it after fixing legacy code)
 *
 * test/architecture.test.ts runs arch:check, so `pnpm test` fails on a new
 * violation. Paths are regexes relative to server/; npm packages are matched
 * unanchored on `node_modules/<pkg>/`.
 */

/** Persistence: Drizzle and everything under src/db (schema, client, row types). */
const PERSISTENCE = ['node_modules/drizzle-orm/', '^src/db/'];

/** SDKs that talk to the outside world (network, processes, native indexers). */
const IO_SDKS =
  'node_modules/(octokit|@octokit/[^/]+|simple-git|openai|@anthropic-ai/sdk|@vscode/ripgrep|@ast-grep/napi|js-tiktoken|dependency-cruiser|postgres)/';

/** Node built-ins that do I/O. */
const NODE_IO = '^(node:)?(fs|fs/promises|child_process|net|http|https)$';

module.exports = {
  forbidden: [
    {
      name: 'only-repositories-touch-the-db',
      comment:
        'Inside a module only repository.ts / repository/* may import drizzle-orm or src/db. ' +
        'Routes call the service; the repository maps rows to domain/contract types.',
      severity: 'error',
      from: { path: '^src/modules/', pathNot: '/repository(\\.ts$|/)' },
      to: { path: PERSISTENCE },
    },
    {
      name: 'modules-use-ports-not-adapters',
      comment:
        'Modules reach the outside world through ports resolved by the Container ' +
        '(container.git, container.llm(), …), never by importing src/adapters/*.',
      severity: 'error',
      from: { path: '^src/modules/' },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'sdks-only-in-adapters',
      comment:
        'I/O SDKs live only in src/adapters/* (and the db client in src/db/). ' +
        'Wrap a new SDK in an adapter that implements a port, wire it in platform/container.ts.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(adapters|db)/' },
      to: { path: IO_SDKS },
    },
    {
      name: 'node-io-only-in-infrastructure',
      comment:
        'Modules do not touch the filesystem, processes or sockets directly — ' +
        'go through a port (GitClient.readFile, CodeIndex, …).',
      severity: 'error',
      from: { path: '^src/modules/' },
      to: { dependencyTypes: ['core'], path: NODE_IO },
    },
    {
      name: 'no-cross-module-imports',
      comment:
        'A module never imports another module folder (only modules/_shared). ' +
        'Shared repositories are exposed by the Container (container.agentsRepo, container.reviewRepo).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/', pathNot: ['^src/modules/$1/', '^src/modules/_shared/'] },
    },
    {
      name: 'adapters-do-not-know-features',
      comment: 'An adapter implements a port; it must not import feature modules.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'platform-does-not-know-features',
      comment:
        'platform/* is infrastructure shared by every module; only the composition root ' +
        '(platform/container.ts) may import module code.',
      severity: 'error',
      from: { path: '^src/platform/', pathNot: '^src/platform/container\\.ts$' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'not-to-unresolvable',
      comment:
        'Every import must resolve — an unresolved alias or path would silently ' +
        'slip past the layer rules above.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'shared-kernel-is-pure',
      comment:
        '@devdigest/shared (src/vendor/shared) holds contracts and port interfaces only — ' +
        'it is mirrored to the client and imported by reviewer-core.',
      severity: 'error',
      from: { path: '^src/vendor/shared/' },
      to: {
        path: [...PERSISTENCE, IO_SDKS, '^src/(modules|adapters|platform)/', 'node_modules/fastify/'],
      },
    },
  ],
  options: {
    // Keep pnpm's symlinked path (node_modules/drizzle-orm/…) instead of the real
    // node_modules/.pnpm/<pkg>@<ver>/… one, so the baseline survives version bumps.
    preserveSymlinks: true,
    doNotFollow: { path: ['node_modules', '^\\.\\./reviewer-core/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
