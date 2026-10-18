import type { Provider } from '@devdigest/shared';

/**
 * The shapes the review flow needs — declared here (consumer-owned) so the
 * service/executor never depend on Drizzle rows. Repository rows satisfy them
 * structurally, so no mapping is needed at the boundary.
 */
export interface ReviewAgent {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  systemPrompt: string;
  strategy: 'single-pass' | 'map-reduce' | 'auto';
  ciFailOn: 'never' | 'critical' | 'warning' | 'any';
  repoIntel: boolean;
  version: number;
}

export interface ReviewPull {
  id: string;
  workspaceId: string;
  repoId: string;
  number: number;
  title: string;
  author: string;
  base: string;
  headSha: string;
  body: string | null;
}

export interface ReviewRepoRef {
  id: string;
  owner: string;
  name: string;
}
