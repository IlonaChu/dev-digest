# UI Architecture — examples

Good/bad patterns for the rules in [SKILL.md](SKILL.md). Paths and names are illustrative.

---

## 1. Folder structure

### Small Next.js app — colocate under routes

```text
src/
  app/
    layout.tsx
    page.tsx
    invoices/
      page.tsx                 # thin: params → compose → render
      _components/             # private to /invoices (not routable)
        InvoiceTable/
          InvoiceTable.tsx
          helpers.ts           # pure: totals, sorting
          constants.ts
          index.ts             # public API of the component
          InvoiceTable.test.tsx
      [id]/
        page.tsx
        _components/InvoiceHeader/…
  components/                  # used by 2+ routes
    PageShell/…
  lib/
    api.ts                     # configured transport
    providers.tsx              # QueryClient, theme, toasts
  env.ts                       # validated env
```

### Growing app — features hold the domain, `app/` only routes

```text
src/
  app/                         # routing layer only
    invoices/page.tsx          # composes features
    invoices/[id]/page.tsx
  features/
    invoices/
      components/InvoiceTable/…
      queries.ts               # queryOptions + key factory
      helpers.ts               # domain rules (pure)
      constants.ts
      types.ts
      index.ts                 # what other code may import
    customers/…
  components/ui/               # design-system primitives
  lib/                         # api client, query client, i18n
  utils/                       # generic, portable functions
```

```text
// BAD — by type at the top level of a growing app: one feature is spread over five folders
src/components/InvoiceTable.tsx
src/hooks/useInvoices.ts
src/utils/invoiceTotals.ts
src/constants/invoices.ts
src/types/invoice.ts
```

## 2. A thin route file

```tsx
// BAD — the route file fetches, maps and renders everything
export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  useEffect(() => { fetch("/api/invoices").then((r) => r.json()).then(setRows); }, []);
  const overdue = rows.filter((r) => new Date(r.due) < new Date() && !r.paid);
  return <table>{/* 200 lines of rows, cells and overdue badges */}</table>;
}

// GOOD — the route composes; data, rules and UI live in their own modules
export default function InvoicesPage() {
  return (
    <PageShell title="Invoices">
      <InvoiceTable />
    </PageShell>
  );
}
```

## 3. Splitting: mutually exclusive states

```tsx
// BAD — nested ternaries, one shell duplicated in your head
return (
  <Card>
    <Header />
    {isPending ? <Spinner /> : error ? <ErrorBox error={error} /> : data.length === 0 ? <Empty /> : <List items={data} />}
  </Card>
);

// GOOD — shared Layout + early returns; TypeScript narrows `query.data` after the status checks
function Layout({ children }: { children: React.ReactNode }) {
  return <Card><Header />{children}</Card>;
}

const query = useQuery(invoiceQueries.list());
if (query.isPending) return <Layout><Spinner /></Layout>;
if (query.isError) return <Layout><ErrorBox error={query.error} /></Layout>;
if (query.data.length === 0) return <Layout><Empty /></Layout>;
return <Layout><List items={query.data} /></Layout>;
```

## 4. Move state down / lift content up

```tsx
// BAD — typing in the search box re-renders the whole page
function Page() {
  const [query, setQuery] = useState("");
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Suggestions query={query} />
      <ExpensiveDashboard />
    </>
  );
}

// GOOD — state moved down into the only part that needs it
function Search() {
  const [query, setQuery] = useState("");
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Suggestions query={query} />
    </>
  );
}
function Page() {
  return (<><Search /><ExpensiveDashboard /></>);
}

// GOOD — when state must stay high, the static subtree comes in as children
function ThemeFrame({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return <div data-theme={theme}><ThemeToggle onChange={setTheme} />{children}</div>;
}
```

## 5. Mode-switching booleans → variants

```tsx
// BAD — every boolean doubles the states; invalid combos (isThread && isEditing) are possible
<Composer isThread isEditing={false} showAttachments hideEmoji />

// GOOD — explicit variants built from shared parts
export function ThreadComposer() {
  return (
    <ComposerFrame>
      <ComposerInput />
      <ComposerAttachments />
      <ComposerSubmit label="Reply" />
    </ComposerFrame>
  );
}
export function EditComposer({ message }: { message: Message }) {
  return (
    <ComposerFrame initialText={message.text}>
      <ComposerInput />
      <ComposerSubmit label="Save" />
    </ComposerFrame>
  );
}

// GOOD — when only a style varies, use a union, not several booleans
type ButtonProps = { variant: "primary" | "secondary" | "danger"; disabled?: boolean };
```

## 6. Compound component, safe across the server/client boundary

```tsx
// tabs.tsx
"use client";
import { createContext, use, useState } from "react";

const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

function useTabs() {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
  return ctx;
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultValue);
  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { active, setActive } = useTabs();
  return <button aria-selected={active === value} onClick={() => setActive(value)}>{children}</button>;
}

export function TabsPanel({ value, children }: { value: string; children: React.ReactNode }) {
  return useTabs().active === value ? <div role="tabpanel">{children}</div> : null;
}

// BAD for Server Component consumers — static members are undefined across the boundary
// Tabs.Trigger = TabsTrigger;   →  <Tabs.Trigger> in a Server Component: "Element type is invalid"
```

## 7. Business logic: hook orchestrates, helper decides

```tsx
// BAD — the rule is buried in the component and testable only through the DOM
function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const isOverdue = !invoice.paid && new Date(invoice.due).getTime() < Date.now() - 3 * 86_400_000;
  return <tr className={isOverdue ? "overdue" : ""}>…</tr>;
}

// GOOD — helpers.ts: pure, no React, the clock is an argument
export const GRACE_PERIOD_DAYS = 3;
const DAY_MS = 86_400_000;

export function isOverdue(invoice: Pick<Invoice, "paid" | "due">, now: number): boolean {
  return !invoice.paid && new Date(invoice.due).getTime() < now - GRACE_PERIOD_DAYS * DAY_MS;
}

// GOOD — the hook wires data and rules together; it holds no rule itself
export function useOverdueInvoices() {
  return useQuery({ ...invoiceQueries.list(), select: (list) => list.filter((i) => isOverdue(i, Date.now())) });
}

// GOOD — helpers.test.ts
it("is not overdue inside the grace period", () => {
  expect(isOverdue({ paid: false, due: "2026-01-10" }, Date.parse("2026-01-12"))).toBe(false);
});
```

```ts
// BAD — a "hook" that calls no hooks
export function useInvoiceTotal(items: Item[]) { return items.reduce((s, i) => s + i.amount, 0); }
// GOOD
export function getInvoiceTotal(items: readonly Item[]) { return items.reduce((s, i) => s + i.amount, 0); }
```

## 8. Strategy map instead of scattered conditionals

```ts
// BAD — the same switch on provider repeated in five components
if (provider === "openai") label = "OpenAI"; else if (provider === "anthropic") label = "Anthropic"; …

// GOOD — one module owns the variant logic (constants.ts or helpers.ts of the feature)
const PROVIDERS = {
  openai: { label: "OpenAI", keyPrefix: "sk-" },
  anthropic: { label: "Anthropic", keyPrefix: "sk-ant-" },
} as const satisfies Record<string, { label: string; keyPrefix: string }>;

export type Provider = keyof typeof PROVIDERS;
export const providerLabel = (p: Provider) => PROVIDERS[p].label;
```

## 9. Data layer: transport → query module → call site

```ts
// lib/api.ts — the only place that knows base URL, headers and error shape
import { env } from "@/env";

const API_BASE = env.NEXT_PUBLIC_API_BASE;

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new ApiError(res.status, "http_error");
  return res.json();
}
```

```ts
// features/invoices/queries.ts — one definition per query, keys from one factory
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

const InvoiceSchema = z.object({ id: z.string(), due: z.string(), paid: z.boolean(), amount: z.number() });
export type Invoice = z.infer<typeof InvoiceSchema>;

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (filters: { status?: string }) => [...invoiceKeys.lists(), filters] as const,
  detail: (id: string) => [...invoiceKeys.all, "detail", id] as const,
};

export const invoiceQueries = {
  list: (filters: { status?: string } = {}) =>
    queryOptions({
      queryKey: invoiceKeys.list(filters),
      queryFn: async () => {
        const path = filters.status ? `/invoices?status=${encodeURIComponent(filters.status)}` : "/invoices";
        return z.array(InvoiceSchema).parse(await apiFetch(path));
      },
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: invoiceKeys.detail(id),
      queryFn: async () => InvoiceSchema.parse(await apiFetch(`/invoices/${id}`)),
    }),
};
```

```tsx
// Call site — reuse the definition, customize by spreading (no configurable wrapper)
const { data: count } = useQuery({ ...invoiceQueries.list(), select: (list) => list.length });

// Mutation — invalidation through the factory, defined next to the queries
export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/invoices/${id}/pay`, { method: "POST" }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

// BAD — keys typed by hand in components drift from the query that owns them
qc.invalidateQueries({ queryKey: ["invoice-list"] });
```

## 10. State placement

```tsx
// BAD — server data copied into state, then "synced" by an Effect
const { data: users } = useQuery(userQueries.list());
const [selected, setSelected] = useState<User | null>(null);
useEffect(() => { if (users && !selected) setSelected(users[0]); }, [users, selected]);

// GOOD — store only the choice (an id), derive the effective value
const { data: users } = useQuery(userQueries.list());
const [selectedId, setSelectedId] = useState<string | null>(null);
const selected = users?.find((u) => u.id === selectedId) ?? users?.[0] ?? null;
```

```ts
// GOOD — URL state parsed and validated in ONE place per route (search-params.ts, no directive)
export const TABS = ["overview", "findings", "diff"] as const;
export type Tab = (typeof TABS)[number];

export function parseTab(raw: string | null): Tab {
  return (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "overview";
}
```

## 11. Constants and types

```ts
// BAD — enum: emits runtime code, nominal, breaks with erasableSyntaxOnly
export enum Severity { Critical = "CRITICAL", Warning = "WARNING" }

// GOOD — the constant is the source of truth, the type is derived from it
export const SEVERITY_LEVELS = ["CRITICAL", "WARNING", "SUGGESTION"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

// GOOD — type-only need? a plain union, no runtime value at all
type Status = "idle" | "running" | "done" | "failed";
```

```ts
// BAD — global dump far from every consumer
// src/constants/index.ts: export const GRID = …; export const MAX_RETRIES = …; export const SIZE_COLOR = …

// GOOD — each constant at the narrowest scope
// app/orders/constants.ts      → TABLE_COLUMNS, STATUS_COLOR  (used by the orders page and its rows)
// lib/api.ts                   → const MAX_RETRIES = 1        (used only there; not exported)
```

## 12. Env and server-only code

```ts
// env.ts — validate once
import { z } from "zod";

export const env = z
  .object({
    NEXT_PUBLIC_API_BASE: z.string().url().default("http://localhost:3001"),
  })
  .parse({ NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE }); // explicit keys: dynamic lookups are not inlined
```

```ts
// data/invoices.ts — Data Access Layer (server only)
import "server-only";
import { cache } from "react";

export const getInvoice = cache(async (id: string) => {
  const user = await getCurrentUser();          // authorization lives here
  const row = await db.invoice.findFirst({ where: { id, ownerId: user.id } });
  return row ? { id: row.id, amount: row.amount, paid: row.paid } : null; // minimal DTO
});
```

## 13. Public API: explicit index, no `export *`

```ts
// BAD — exposes internals, loads every module, invites cycles
export * from "./InvoiceTable";
export * from "./helpers";

// GOOD — the folder's deliberate surface
export { InvoiceTable } from "./InvoiceTable";
export { isOverdue } from "./helpers";
export type { InvoiceTableProps } from "./InvoiceTable";
```

## 14. Promote instead of deep-importing

```ts
// BAD — the orders list reaches into the order-detail route's private folder
import { orderTotal } from "../../[id]/_components/OrderSummary/helpers";

// GOOD — once a second route needs it, move it to the nearest shared scope and import its public API
import { orderTotal } from "@/features/orders";      // or "@/components/OrderSummary"
```
