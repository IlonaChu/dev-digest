import * as t from '../../src/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import type { PgFixture } from './pg.js';

/**
 * `runReview` is fire-and-forget: the POST returns runIds immediately and each
 * agent's review is persisted in the background (the client subscribes to SSE).
 * Tests that assert on persisted reviews/findings/traces must first wait for the
 * background runs to finish. This polls `agent_runs` until every row for the PR
 * reaches a terminal status (done / failed / cancelled) AND has its `run_traces`
 * row: the executor commits the terminal status (persistRunOutcome) before it
 * saves the trace, so status alone lets a test read a trace that isn't there yet.
 */
const TERMINAL = new Set(['done', 'failed', 'cancelled']);

export async function waitForPrRuns(
  db: PgFixture['handle']['db'],
  prId: string,
  opts: { expected?: number; timeoutMs?: number } = {},
): Promise<Array<typeof t.agentRuns.$inferSelect>> {
  const { expected, timeoutMs = 10_000 } = opts;
  const start = Date.now();
  for (;;) {
    const runs = await db.select().from(t.agentRuns).where(eq(t.agentRuns.prId, prId));
    const terminalIds = runs.filter((r) => TERMINAL.has(r.status ?? '')).map((r) => r.id);
    const traced =
      terminalIds.length === 0
        ? 0
        : (
            await db
              .select({ runId: t.runTraces.runId })
              .from(t.runTraces)
              .where(inArray(t.runTraces.runId, terminalIds))
          ).length;
    // With an explicit `expected`, wait until that many runs finish (ignores any
    // extra rows, e.g. a trifecta scan). Otherwise wait for all rows to settle.
    const done =
      expected != null
        ? traced >= expected
        : runs.length > 0 && traced === runs.length;
    if (done) return runs;
    if (Date.now() - start > timeoutMs) return runs;
    await new Promise((r) => setTimeout(r, 25));
  }
}
