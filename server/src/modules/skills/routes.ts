import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SkillType } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { IMPORT_BODY_LIMIT, MAX_DESCRIPTION_LENGTH } from './constants.js';
import { SkillsService } from './service.js';

/**
 * Skills module.
 *   GET    /skills                                  → list (workspace-scoped, with agent_count)
 *   GET    /skills/:id                              → one skill
 *   POST   /skills                                  → create (source is always 'manual')
 *   PUT    /skills/:id                              → update (body/description change → new version)
 *   DELETE /skills/:id                              → delete (versions + agent links cascade)
 *   GET    /skills/:id/versions                     → version history (newest first)
 *   POST   /skills/:id/versions/:version/restore    → restore as a new version
 *   POST   /skills/:id/vet                          → re-run vetting (imported skills only)
 *   POST   /skills/import/preview                   → parse + vet a .md/.zip, stores nothing
 *   POST   /skills/import                           → confirm: stored disabled, source 'imported'
 */

const RestoreParams = z.object({
  id: z.string().uuid(),
  version: z.coerce.number().int().positive(),
});

const CreateSkillBody = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  type: SkillType.optional(),
  body: z.string().min(1),
  enabled: z.boolean().optional(),
});

const UpdateSkillBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  type: SkillType.optional(),
  body: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  version_message: z.string().max(200).optional(),
});

const ImportPreviewBody = z.object({
  filename: z.string().min(1).max(255),
  content_base64: z.string().min(1),
});

const ImportBody = ImportPreviewBody.extend({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  type: SkillType.optional(),
});

export default async function skillsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new SkillsService(app.container);

  app.get('/skills', async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId);
  });

  // Static `/skills/import*` routes win over `/skills/:id` in find-my-way.
  app.post(
    '/skills/import/preview',
    { bodyLimit: IMPORT_BODY_LIMIT, schema: { body: ImportPreviewBody } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.previewImport(workspaceId, req.body.filename, req.body.content_base64);
    },
  );

  app.post(
    '/skills/import',
    { bodyLimit: IMPORT_BODY_LIMIT, schema: { body: ImportBody } },
    async (req, reply) => {
      const { workspaceId } = await getContext(app.container, req);
      const { filename, content_base64, name, description, type } = req.body;
      const skill = await service.importSkill(workspaceId, filename, content_base64, {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
      });
      reply.status(201);
      return skill;
    },
  );

  app.get('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.get(workspaceId, req.params.id);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.post('/skills', { schema: { body: CreateSkillBody } }, async (req, reply) => {
    const { workspaceId } = await getContext(app.container, req);
    const b = req.body;
    const skill = await service.create(workspaceId, {
      name: b.name,
      body: b.body,
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.type !== undefined ? { type: b.type } : {}),
      ...(b.enabled !== undefined ? { enabled: b.enabled } : {}),
    });
    reply.status(201);
    return skill;
  });

  app.put('/skills/:id', { schema: { params: IdParams, body: UpdateSkillBody } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.update(workspaceId, req.params.id, req.body);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.delete('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const ok = await service.delete(workspaceId, req.params.id);
    if (!ok) throw new NotFoundError('Skill not found');
    return { ok: true };
  });

  app.get('/skills/:id/versions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const versions = await service.listVersions(workspaceId, req.params.id);
    if (!versions) throw new NotFoundError('Skill not found');
    return versions;
  });

  app.post(
    '/skills/:id/versions/:version/restore',
    { schema: { params: RestoreParams } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      const skill = await service.restore(workspaceId, req.params.id, req.params.version);
      if (!skill) throw new NotFoundError('Skill or version not found');
      return skill;
    },
  );

  app.post('/skills/:id/vet', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.vet(workspaceId, req.params.id);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });
}
