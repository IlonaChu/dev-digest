# UI Architecture — enforcement

How to make the rules in [SKILL.md](SKILL.md) machine-checked. Source IDs refer to the [catalog](README.md) (E1–E8, B1).

> These configs are **starting points adapted from the tools' docs and Bulletproof React**. They have not been
> tested against a specific codebase. Before adopting one, run it in `warn` mode, fix or allow-list the findings,
> then switch it to `error`.

## Adoption order

| Step | Check | Tool | Why first |
|------|-------|------|-----------|
| 1 | Server code can't leak into client bundles | `server-only` / `client-only` imports | Zero config, build-time error, prevents secret leaks |
| 2 | No import cycles | `import-x/no-cycle` or dependency-cruiser `circular` | Cycles break barrels and HMR, and hide wrong dependency direction |
| 3 | One-way dependencies and feature isolation | `import-x/no-restricted-paths`, `eslint-plugin-boundaries` or dependency-cruiser | Encodes the core architecture rule |
| 4 | No dead files or exports | Knip | Keeps "promote on reuse" honest; finds orphaned helpers |
| 5 | File and folder naming | `eslint-plugin-check-file` or `unicorn/filename-case` | Cosmetic, so adopt it last; it touches the most files |

## 1. `server-only` / `client-only`

```ts
// data/invoices.ts — any module with secrets, DB access or the DAL
import "server-only"; // importing this module from a Client Component fails the build
```

Next.js handles both markers internally. Installing the `server-only` package is optional, but it keeps the import
explicit and type-checked (N4, E5).

## 2–3. ESLint: cycles and restricted paths (`eslint-plugin-import-x`)

`import-x` is the maintained fork of `eslint-plugin-import`; the rule options are the same (E2).
Configure its TypeScript resolver so `@/…` aliases resolve; see the plugin docs.

```js
// eslint.config.mjs (flat config)
import importX from "eslint-plugin-import-x";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "import-x": importX },
    rules: {
      "import-x/no-cycle": ["error", { maxDepth: 10 }], // cost grows with the graph; cap the depth

      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Feature isolation: each feature may import only itself (one zone per feature)
            { target: "./src/features/invoices", from: "./src/features", except: ["./invoices"] },
            { target: "./src/features/customers", from: "./src/features", except: ["./customers"] },

            // One-way flow: features never import the routing layer
            { target: "./src/features", from: "./src/app" },

            // Shared code never imports features or routes
            {
              target: ["./src/components", "./src/hooks", "./src/lib", "./src/utils"],
              from: ["./src/features", "./src/app"],
            },
          ],
        },
      ],
    },
  },
];
```

Zones match **resolved file paths**, not import strings. So they catch both relative and aliased imports (E2, B1).

### Heuristic: no reaching into another route's private folder

`no-restricted-paths` can't express "only the owning segment may import its `_components/`". A pattern on the import
string catches the common case: a relative path that climbs up and then dives into a sibling's private folder.
**Unverified** — test it on the repo before relying on it.

```js
"no-restricted-imports": [
  "warn",
  {
    patterns: [
      {
        group: ["../*/_components/**", "../../*/_components/**", "../../../*/_components/**"],
        message: "This is another route's private component. Promote it to src/components or a feature and import its index.",
      },
    ],
  },
],
```

## 3 (alternative). `eslint-plugin-boundaries`

This plugin classifies files into **elements**, then allows or disallows dependencies between element types (E1).
In v7 the canonical rule is `boundaries/dependencies`. `element-types` is its deprecated alias, and old
`eslint-disable` comments that use legacy rule names stop working.

```js
settings: {
  "boundaries/elements": [
    { type: "app", pattern: "src/app/**" },
    { type: "feature", pattern: "src/features/*", capture: ["feature"] },
    { type: "shared", pattern: "src/{components,hooks,lib,utils}/**" },
  ],
},
// rules: "boundaries/dependencies" — allow app → feature|shared, feature → shared (same feature only), shared → shared.
// Write the rule options from https://www.jsboundaries.dev/docs/overview/ for the installed major version.
```

## 3 (alternative). dependency-cruiser

dependency-cruiser uses regex rules with **group matching**. That expresses "no cross-feature imports" in one rule
instead of one zone per feature (E3).

```js
// .dependency-cruiser.cjs — run: npx depcruise src --config .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-cross-feature",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/", pathNot: "^src/features/$1/" },
    },
    {
      name: "shared-stays-shared",
      severity: "error",
      from: { path: "^src/(components|hooks|lib|utils)/" },
      to: { path: "^src/(features|app)/" },
    },
    { name: "no-orphans", severity: "warn", from: { orphan: true, pathNot: "\\.d\\.ts$" }, to: {} },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
```

`npx depcruise --init` generates a baseline config. `--output-type mermaid` or `dot` draws the dependency graph,
which is useful when reviewing a restructure.

## 4. Knip — unused files, exports, dependencies

```sh
npx knip            # report
npx knip --fix      # remove unused exports/deps after review
```

The Next.js plugin turns itself on when `next` is a dependency. It treats `app/**/{page,layout,route,loading,error,…}`,
`proxy`/`middleware` and `next.config` as entry files (E6). Exclude vendored code instead of ignoring individual
findings:

```json
{ "project": ["src/**/*.{ts,tsx}"], "ignore": ["src/vendor/**"] }
```

Fix from the top down: unused files first, then exports, then dependencies. Treat `ignore` options as a last resort.

## 5. Naming

```js
// eslint-plugin-check-file (flat config, v3+) — Bulletproof's kebab-case setup (E8, B1)
import checkFile from "eslint-plugin-check-file";

{
  plugins: { "check-file": checkFile },
  rules: {
    "check-file/filename-naming-convention": ["error", { "**/*.{ts,tsx}": "KEBAB_CASE" }, { ignoreMiddleExtensions: true }],
    "check-file/folder-naming-convention": ["error", { "src/**/!(__tests__)": "KEBAB_CASE" }],
  },
}

// eslint-plugin-unicorn — allow two cases when components are PascalCase and everything else kebab-case
"unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
```

Adapt the globs to the repo's convention, for example PascalCase component folders and `.tsx` files with
kebab-case everywhere else.

## Barrel hygiene

- **Ban `export *` in app code.** A `no-restricted-syntax` rule on `ExportAllDeclaration` does this:
  ```js
  "no-restricted-syntax": ["error", { selector: "ExportAllDeclaration", message: "Use explicit named re-exports." }],
  ```
- **npm packages with big barrels:** `experimental.optimizePackageImports` in `next.config` (N11). About 27 common
  libraries are already optimized by default.
