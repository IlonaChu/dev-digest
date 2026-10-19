import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ConventionStatus, SkillType } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { ConventionsService } from './service.js';

/**
 * Conventions module.
 *   GET   /repos/:id/conventions                → candidates + latest scan
 *   POST  /repos/:id/conventions/extract        → sample → model → verify evidence → store
 *   PATCH /repos/:id/conventions/status         → select all / deselect all (not rejected)
 *   POST  /repos/:id/conventions/skill-draft    → markdown draft from chosen conventions
 *   POST  /repos/:id/conventions/skill          → create the skill (source 'extracted')
 *   PATCH /conventions/:id                      → accept / un-accept / reject / edit the rule text
 *
 * Reject is `status: 'rejected'`, not a delete: the row stays so a re-scan keeps it rejected,
 * while the list hides it and the skill refuses it.
 */

const PatchBody = z
  .object({
    status: ConventionStatus.optional(),
    rule: z.string().trim().min(1).max(500).optional(),
  })
  .refine((b) => b.status !== undefined || b.rule !== undefined, 'Nothing to change');

const BulkStatusBody = z.object({ status: z.enum(['pending', 'accepted']) });

const DraftBody = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

const CreateSkillBody = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  type: SkillType.optional(),
  enabled: z.boolean().optional(),
  body: z.string().min(1),
  convention_ids: z.array(z.string().uuid()).min(1).max(100),
});

export default async function conventionsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new ConventionsService(app.container);

  app.get('/repos/:id/conventions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId, req.params.id);
  });

  app.post('/repos/:id/conventions/extract', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.extract(workspaceId, req.params.id);
  });

  app.patch(
    '/repos/:id/conventions/status',
    { schema: { params: IdParams, body: BulkStatusBody } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.setAll(workspaceId, req.params.id, req.body.status);
    },
  );

  app.post(
    '/repos/:id/conventions/skill-draft',
    { schema: { params: IdParams, body: DraftBody } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.draft(workspaceId, req.params.id, req.body.ids);
    },
  );

  app.post(
    '/repos/:id/conventions/skill',
    { schema: { params: IdParams, body: CreateSkillBody } },
    async (req, reply) => {
      const { workspaceId } = await getContext(app.container, req);
      const created = await service.createSkill(workspaceId, req.params.id, req.body);
      return reply.status(201).send(created);
    },
  );

  app.patch('/conventions/:id', { schema: { params: IdParams, body: PatchBody } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.patch(workspaceId, req.params.id, req.body);
  });
}
