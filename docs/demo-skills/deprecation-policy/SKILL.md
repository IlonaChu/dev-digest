---
name: deprecation-policy
description: Apply when the diff removes, renames or replaces a route, a request field or a response field of a released HTTP API, or marks one as deprecated. Flag removals that skip the deprecation window and deprecations that give clients no replacement, no sunset date or no signal.
type: convention
---
# Deprecation policy

Clients cannot upgrade on our schedule. A released route or field is removed only
after it has been deprecated, announced and kept working for a full window.

## The policy
1. **Announce first.** A route or field is marked deprecated in one release and
   removed no earlier than the next MAJOR release, and at least 90 days later.
2. **Keep it working.** A deprecated route still answers with its old contract; a
   deprecated response field is still populated with correct data until removal.
3. **Signal it on the wire.** Responses of a deprecated route carry a
   `Deprecation` header and a `Sunset` header with the removal date; a deprecated
   schema field is marked with `.describe('Deprecated: use <replacement>')`.
4. **Name the replacement.** Every deprecation states what to use instead and
   from which version it is available. The replacement ships before or together
   with the deprecation, never after it.
5. **Write it down.** The changelog lists the item under "Deprecated" when it is
   announced and under "Removed" when it goes away.

## Flag when
- A released route or field is removed in this diff, and nothing in the diff or
  the changelog shows it was deprecated in an earlier release → CRITICAL.
- A field is marked deprecated but the handler stops populating it (returns
  `null` or drops the key) before the sunset date → CRITICAL.
- A deprecation without a replacement, without a sunset date, or without the
  `Deprecation` / `Sunset` headers on a deprecated route → WARNING.
- The removal date in the code and in the changelog disagree → WARNING.

## Out of scope
- Routes and fields that were added in the same unreleased version.
- Internal endpoints that are documented as not public (health checks, admin
  tooling behind a separate prefix).

## Good
```ts
// v2.4.0 — old field kept and populated, replacement available, clients warned
export const PullSummary = z.object({
  id: z.string().uuid(),
  author: z.string(),
  author_login: z.string().describe('Deprecated: use author. Removed in 3.0.0'),
});

app.get('/repos/:id/pulls', { schema: { params: IdParams, response: { 200: PullList } } },
  async (req, reply) => {
    reply.header('Deprecation', 'true');
    reply.header('Sunset', 'Wed, 31 Mar 2027 00:00:00 GMT');
    return service.list(req.params.id);
  });
```

## Bad
```ts
// v2.4.0 — field removed in a minor release with no prior deprecation:
// every client that reads author_login now gets undefined
export const PullSummary = z.object({
  id: z.string().uuid(),
  author: z.string(),
});
```

## How to report
Cite the line that removes or deprecates the item. Name the client-visible effect
and the missing step, e.g. "`author_login` is removed in 2.4.0 without a
deprecation release — keep it populated, mark it deprecated with a sunset date,
and remove it in 3.0.0".
