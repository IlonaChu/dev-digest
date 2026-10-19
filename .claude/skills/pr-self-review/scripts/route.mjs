// Maps changed files to the skills that must review them (routing.json), per group.
// Usage: node route.mjs [path/to/diff.json]   (default: <state>/diff.json)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, matchesAny, repoRoot, stateDir } from './lib.mjs';

const SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

export function route(diff, routing, installedSkills = []) {
  const skills = {};
  const covered = new Set();
  const files = diff.files.filter((f) => f.status !== 'D' && !matchesAny(f.path, routing.ignore));

  for (const [name, rule] of Object.entries(routing.skills)) {
    if (rule.never) continue;
    const signals = (rule.signals ?? []).map((s) => new RegExp(s));
    const hits = files.filter((f) => {
      if (matchesAny(f.path, rule.exclude)) return false;
      if (matchesAny(f.path, rule.paths)) return true;
      if (rule.scope && !matchesAny(f.path, rule.scope)) return false;
      return signals.length > 0 && f.added.some((line) => signals.some((re) => re.test(line)));
    });
    if (hits.length === 0) continue;
    skills[name] = { group: rule.group, files: hits.map((f) => f.path) };
    hits.forEach((f) => covered.add(f.path));
  }

  const groups = {};
  for (const [name, { group, files: groupFiles }] of Object.entries(skills)) {
    groups[group] ??= { skills: [], files: [] };
    groups[group].skills.push(name);
    groups[group].files = [...new Set([...groups[group].files, ...groupFiles])];
  }

  return {
    groups,
    skills,
    uncovered: files.map((f) => f.path).filter((p) => !covered.has(p)),
    unrouted_skills: installedSkills.filter((s) => !(s in routing.skills)),
  };
}

export function installedSkills(root) {
  const dir = join(root, '.claude/skills');
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'SKILL.md')))
    .map((d) => d.name);
}

if (isMain(import.meta.url)) {
  const diff = JSON.parse(readFileSync(process.argv[2] ?? join(stateDir(), 'diff.json'), 'utf8'));
  const routing = JSON.parse(readFileSync(join(SKILL_DIR, 'routing.json'), 'utf8'));
  console.log(JSON.stringify(route(diff, routing, installedSkills(repoRoot())), null, 2));
}
