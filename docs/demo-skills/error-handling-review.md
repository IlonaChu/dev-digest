---
name: error-handling-review
description: Apply when the diff adds or changes try/catch blocks, promise rejections or error responses. Flag swallowed errors, lost stack traces and generic 500 responses where a typed error exists.
type: rubric
---
# Error handling review

Every error path the diff touches must either handle the error meaningfully or
let it propagate with its context intact. Treat `catch` blocks as code that needs
the same scrutiny as the happy path.

## Flag when
- A `catch` block is empty, only logs, or returns a default value without telling
  the caller that something went wrong. -> WARNING
- An error is re-thrown as `new Error(String(err))`, dropping the original cause
  and stack trace. Prefer `new AppError('...', { cause: err })`. -> WARNING
- A route handler answers with a generic 500 for a validation or not-found case
  where the project already has a typed error (`ValidationError`, `NotFoundError`). -> WARNING
- `async` work inside `Promise.all` is added without handling a partial failure
  when the results are written to the database. -> CRITICAL
- Retry logic is added without a bound (no max attempts, no backoff). -> WARNING

## Not a finding
- `catch` blocks that explicitly translate an external error into a domain error.
- Logging plus re-throw: that keeps both the record and the propagation.
- Test code that intentionally swallows errors to assert they were thrown.

## Output
One finding per location. Quote the `file:line`, say which rule above applies,
and suggest the smallest change that fixes it.
