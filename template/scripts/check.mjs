// Checks that the project's documents are present, well formed and current.
// Each check returns a list of problems; `npm run check` prints them all.

import { spawnSync } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { codeTokens, INTERFACE_LINES, parseInterfaces, START, staleDocs } from './generate-docs.mjs';

export const REQUIRED_FILES = ['README.md', 'AGENTS.md', 'MEMORY.md', 'SPEC.md', 'CHANGELOG.md', 'TODOS.md', 'DEPENDENCIES.md'];
export const MEMORY_MAX_LINES = 150;
export const FEATURE_MEMORY_MAX_LINES = 80;
export const FEATURE_SPEC_SECTIONS = ['Behavior', 'Interfaces', 'Boundaries', 'Verification'];
// Where a project lists the routes and messages its code defines; see that file.
export const DECLARED_INTERFACES = 'scripts/declared-interfaces.mjs';
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
// Where `npx github:lnmunhoz/agent-ready-repo --existing` saves template files that clashed with the project's own.
export const MERGE_DIR = '.agent-ready-merge';
// The template files that contain {{placeholders}} before a project is created.
const PLACEHOLDER_FILES = new Set(['README.md', 'AGENTS.md', 'SPEC.md', 'CHANGELOG.md', 'package.json']);

const toPosix = path => path.split(sep).join('/');

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? (SKIP_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name)))
    : [join(dir, entry.name)]));
  return nested.flat().sort();
}

// The project's own files: in a Git repository, what Git tracks or would track
// (so ignored folders such as build output and vendored code are skipped);
// otherwise every file outside the usual generated folders.
export async function projectFiles(root) {
  const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
  if (git.status !== 0) return walk(root);
  const files = [];
  for (const path of git.stdout.split('\0').filter(Boolean)) {
    if (await exists(join(root, path))) files.push(join(root, path));
  }
  return files.sort();
}

// Returns the lines under each "## Heading", keyed by heading text.
function sections(markdown) {
  const result = new Map();
  let current = null;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) { current = heading[1]; result.set(current, []); } else if (current) result.get(current).push(line);
  }
  return result;
}

/** TODOS.md needs Open and Completed, with unchecked items only under Open and checked only under Completed. */
export function checkTodos(markdown) {
  const problems = [];
  const parts = sections(markdown);
  for (const name of ['Open', 'Completed']) if (!parts.has(name)) problems.push(`TODOS.md needs a "## ${name}" section.`);
  for (const line of parts.get('Open') ?? []) {
    if (/^\s*- \[x\]/i.test(line)) problems.push(`TODOS.md: finished item under Open, move it to Completed: ${line.trim()}`);
  }
  for (const line of parts.get('Completed') ?? []) {
    if (/^\s*- \[ \]/.test(line)) problems.push(`TODOS.md: unfinished item under Completed: ${line.trim()}`);
  }
  return problems;
}

/** CHANGELOG.md groups entries under "## YYYY-MM-DD" headings, newest first, each date once. */
export function checkChangelog(markdown) {
  const problems = [];
  const dates = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)].map(match => match[1]);
  if (!dates.length) problems.push('CHANGELOG.md needs at least one "## YYYY-MM-DD" section.');
  for (const date of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push(`CHANGELOG.md: "## ${date}" should be a date like 2026-01-31.`);
  }
  const valid = dates.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
  for (let i = 1; i < valid.length; i += 1) {
    if (valid[i] === valid[i - 1]) problems.push(`CHANGELOG.md: ${valid[i]} appears twice; keep one section per date.`);
    else if (valid[i] > valid[i - 1]) problems.push(`CHANGELOG.md: ${valid[i]} is below ${valid[i - 1]}; put the newest date first.`);
  }
  return problems;
}

/** A memory file stays short enough to load whole, and each entry is dated so stale ones are easy to spot. */
export function checkMemory(markdown, path = 'MEMORY.md', limit = MEMORY_MAX_LINES) {
  const problems = [];
  const lines = markdown.split('\n').length;
  if (lines > limit) {
    problems.push(`${path} has ${lines} lines (limit ${limit}). Move standing rules into AGENTS.md or a SPEC.md and delete outdated entries.`);
  }
  for (const line of markdown.split('\n')) {
    if (/^- /.test(line) && !/^- \*\*\d{4}-\d{2}-\d{2}\*\* · \S/.test(line)) {
      problems.push(`${path}: entries start with "- **YYYY-MM-DD** · ": ${line.trim()}`);
    }
  }
  return problems;
}

/** A feature SPEC.md has a title, a summary and the standard sections. */
export function checkFeatureSpec(path, markdown) {
  const problems = [];
  if (!/^#\s+\S/m.test(markdown)) problems.push(`${path} needs a "# Title" line.`);
  const parts = sections(markdown);
  for (const name of FEATURE_SPEC_SECTIONS) {
    if (!parts.has(name)) problems.push(`${path} needs a "## ${name}" section.`);
    else if (!parts.get(name).some(line => line.trim())) problems.push(`${path}: "## ${name}" is empty.`);
  }
  if (parts.has('Interfaces')) {
    const lines = parseInterfaces(markdown);
    for (const key of INTERFACE_LINES) {
      if (!lines[key]) problems.push(`${path}: Interfaces needs a "- **${key}:** …" line (write "None." when there is nothing).`);
    }
  }
  return problems;
}

const withoutCode = markdown => markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

/** Relative links in Markdown as `{ path, anchor }`; `path` is '' for a link within the same file. URLs and code are ignored. */
export function markdownLinkTargets(markdown) {
  return [...withoutCode(markdown).matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map(match => match[1])
    .filter(target => !/^[a-z][a-z0-9+.-]*:/i.test(target))
    .map(target => {
      const [path, anchor = ''] = target.split('#');
      return { path: decodeURIComponent(path), anchor: decodeURIComponent(anchor) };
    })
    .filter(({ path, anchor }) => path || anchor);
}

/** Relative links in Markdown must point at files that exist. Code spans and fences are ignored. */
export function markdownLinks(markdown) {
  return markdownLinkTargets(markdown).map(({ path }) => path).filter(Boolean);
}

/** The anchors GitHub gives a document's headings: lowercase, punctuation dropped, spaces as dashes, repeats numbered. */
export function headingAnchors(markdown) {
  const anchors = new Set();
  const seen = new Map();
  for (const [, text] of markdown.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = text
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count ? `${base}-${count}` : base);
  }
  return anchors;
}

export async function checkLinks(root) {
  const problems = [];
  const anchorsOf = new Map();
  for (const file of await projectFiles(root)) {
    if (!file.endsWith('.md') || toPosix(relative(root, file)).startsWith(`${MERGE_DIR}/`)) continue;
    const from = toPosix(relative(root, file));
    for (const { path, anchor } of markdownLinkTargets(await readFile(file, 'utf8'))) {
      const target = path ? resolve(dirname(file), path) : file;
      const shown = `${path}${anchor ? `#${anchor}` : ''}`;
      if (!await exists(target)) { problems.push(`${from}: broken link to ${shown}`); continue; }
      if (!anchor || !target.endsWith('.md')) continue;
      if (!anchorsOf.has(target)) anchorsOf.set(target, headingAnchors(await readFile(target, 'utf8')));
      if (!anchorsOf.get(target).has(anchor.toLowerCase())) problems.push(`${from}: link to ${shown} has no matching heading`);
    }
  }
  return problems;
}

/** A feature spec links the root SPEC.md user stories it implements, so the two levels stay connected. */
export function checkStoryLinks(path, markdown) {
  const own = markdown.split(START)[0];
  const stories = markdownLinkTargets(own).filter(({ path: target, anchor }) => target === '../../SPEC.md' && anchor);
  return stories.length ? [] : [`${path} links no user story: add a "User stories:" line linking the sections of the root SPEC.md it implements, such as [Add a task](../../SPEC.md#add-a-task).`];
}

/**
 * Compares what the code defines (from scripts/declared-interfaces.mjs) with what
 * the feature specs list under Serves and Handles. `declared` is null when the
 * project hasn't declared anything yet; a list it leaves out isn't checked.
 */
export function interfaceCompleteness(declared, specs) {
  if (declared === null || declared === undefined) return [];
  const problems = [];
  for (const [key, line] of [['serves', 'Serves'], ['handles', 'Handles']]) {
    if (declared[key] === undefined) continue;
    if (!Array.isArray(declared[key])) { problems.push(`${DECLARED_INTERFACES}: "${key}" must be a list of strings.`); continue; }
    const defined = new Set(declared[key]);
    const listed = new Map();
    for (const [feature, markdown] of specs) {
      for (const token of codeTokens(parseInterfaces(markdown)[line])) listed.set(token, feature);
    }
    for (const token of [...defined].sort()) {
      if (!listed.has(token)) problems.push(`\`${token}\` is defined in the code but no feature lists it under ${line}.`);
    }
    for (const [token, feature] of [...listed].sort()) {
      if (!defined.has(token)) problems.push(`features/${feature}/SPEC.md lists \`${token}\` under ${line}, but ${DECLARED_INTERFACES} doesn't define it.`);
    }
  }
  return problems;
}

export async function checkDeclaredInterfaces(root, specs) {
  const file = join(root, DECLARED_INTERFACES);
  if (!await exists(file)) return [];
  const module = await import(pathToFileURL(file).href);
  if (typeof module.declaredInterfaces !== 'function') return [`${DECLARED_INTERFACES} must export a declaredInterfaces(root) function.`];
  return interfaceCompleteness(await module.declaredInterfaces(root), specs);
}

/** Setup notes left by the project template: `<!-- setup: what to write here -->`. */
export function setupNotes(text) {
  return [...text.matchAll(/<!--\s*setup:\s*([\s\S]*?)\s*-->/g)].map(match => match[1].replace(/\s+/g, ' '));
}

/** Lists what is left to fill in after creating the project: setup notes, unreplaced placeholders and files waiting to be merged. */
export async function checkSetup(root) {
  const problems = [];
  const merging = [];
  for (const file of await projectFiles(root)) {
    const path = toPosix(relative(root, file));
    if (path.startsWith(`${MERGE_DIR}/`)) { merging.push(path); continue; }
    if (!path.endsWith('.md')) {
      if (!PLACEHOLDER_FILES.has(path)) continue;
    }
    const text = await readFile(file, 'utf8');
    for (const note of setupNotes(text)) problems.push(`Finish setup in ${path}: ${note}`);
    if (!PLACEHOLDER_FILES.has(path)) continue;
    for (const [placeholder] of text.matchAll(/\{\{(?:name|description|package|date)\}\}/g)) {
      problems.push(`Finish setup in ${path}: replace ${placeholder}.`);
    }
  }
  if (merging.length) {
    problems.push(`Finish setup: merge the template's versions in ${MERGE_DIR}/ into your own files (${merging.map(path => path.slice(MERGE_DIR.length + 1)).join(', ')}), then delete ${MERGE_DIR}/.`);
  }
  return problems;
}

/** Claude Code reads .claude/skills and Codex reads .agents/skills; the copies must match. */
export async function checkSkillCopies(root) {
  const problems = [];
  const list = async dir => (await exists(dir))
    ? (await walk(dir)).map(file => toPosix(relative(dir, file))) : [];
  const claude = join(root, '.claude', 'skills');
  const agents = join(root, '.agents', 'skills');
  const files = new Set([...await list(claude), ...await list(agents)]);
  for (const file of [...files].sort()) {
    let a; let b;
    try { a = await readFile(join(claude, file), 'utf8'); } catch { /* missing */ }
    try { b = await readFile(join(agents, file), 'utf8'); } catch { /* missing */ }
    if (a === undefined) problems.push(`.agents/skills/${file} has no copy in .claude/skills/.`);
    else if (b === undefined) problems.push(`.claude/skills/${file} has no copy in .agents/skills/.`);
    else if (a !== b) problems.push(`Skill copies differ: .claude/skills/${file} and .agents/skills/${file}.`);
  }
  return problems;
}

export async function runChecks(root) {
  const problems = [...await checkSetup(root)];
  for (const file of REQUIRED_FILES) if (!await exists(join(root, file))) problems.push(`Missing ${file}.`);
  if (await exists(join(root, 'TODOS.md'))) problems.push(...checkTodos(await readFile(join(root, 'TODOS.md'), 'utf8')));
  if (await exists(join(root, 'CHANGELOG.md'))) problems.push(...checkChangelog(await readFile(join(root, 'CHANGELOG.md'), 'utf8')));
  if (await exists(join(root, 'MEMORY.md'))) problems.push(...checkMemory(await readFile(join(root, 'MEMORY.md'), 'utf8')));
  const featureRoot = join(root, 'features');
  const specs = new Map();
  if (await exists(featureRoot)) {
    for (const entry of await readdir(featureRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const spec = join(featureRoot, entry.name, 'SPEC.md');
      const memory = join(featureRoot, entry.name, 'MEMORY.md');
      if (await exists(spec)) {
        const markdown = await readFile(spec, 'utf8');
        specs.set(entry.name, markdown);
        problems.push(...checkFeatureSpec(`features/${entry.name}/SPEC.md`, markdown));
        problems.push(...checkStoryLinks(`features/${entry.name}/SPEC.md`, markdown));
      }
      if (await exists(memory)) {
        problems.push(...checkMemory(await readFile(memory, 'utf8'), `features/${entry.name}/MEMORY.md`, FEATURE_MEMORY_MAX_LINES));
      }
    }
  }
  const { stale, problems: generatorProblems } = await staleDocs(root);
  problems.push(...generatorProblems);
  if (stale.length) problems.push(`Out of date: ${stale.join(', ')}. Run npm run docs:generate.`);
  problems.push(...await checkDeclaredInterfaces(root, specs));
  problems.push(...await checkLinks(root));
  problems.push(...await checkSkillCopies(root));
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const problems = await runChecks(root);
  if (problems.length) {
    console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log('All checks passed.');
}
