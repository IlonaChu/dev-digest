/**
 * Background job kinds registered on the JobRunner. Handlers live in
 * repo-intel; the repos module enqueues them after a clone/refresh.
 */
export const INDEX_JOB_KIND = 'repo-intel-index';
export const REFRESH_JOB_KIND = 'repo-intel-refresh';
/** Manual "re-analyze": fetch latest from origin + incremental reindex. */
export const RESYNC_JOB_KIND = 'repo-intel-resync';
