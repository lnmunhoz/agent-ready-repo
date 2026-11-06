// Builds DEPENDENCIES.md and the "Dependencies" section of every feature SPEC.md
// from the relative imports in features/. Run with --check to fail instead of
// writing when a file is out of date.
//
// Only this file reads code. It understands JavaScript and TypeScript imports;
// for another language, change IMPORT and resolveImport below.

import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const START = '<!-- dependencies:start -->';
export const END = '<!-- dependencies:end -->';

const CODE = /\.(?:[cm]?[jt]sx?)$/;
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage']);

const toPosix = path => path.split(sep).join('/');
const escapeLabel = text => text.replaceAll('"', '&quot;');

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    if (entry.isDirectory()) {
      return entry.name.startsWith('.') || SKIP_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name));
    }
    return [join(dir, entry.name)];
  }));
  return nested.flat().sort();
}

// Projects often import the build output name (./foo.mjs) of a TypeScript
// source (./foo.mts). Resolve to the file that actually exists in the repo.
async function resolveImport(root, fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    base.replace(/\.mjs$/, '.mts'),
    base.replace(/\.cjs$/, '.cts'),
    base.replace(/\.js$/, '.ts'),
    base.replace(/\.js$/, '.tsx'),
    ...['.js', '.mjs', '.ts', '.mts', '.tsx', '.jsx'].map(ext => base + ext),
    ...['index.js', 'index.mjs', 'index.ts', 'index.mts'].map(name => join(base, name)),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate) && CODE.test(candidate)) return toPosix(relative(root, candidate));
  }
  return toPosix(relative(root, base));
}

function featureTitle(name, spec) {
  return spec?.match(/^#\s+(.+)$/m)?.[1].trim() ?? name;
}

function featureLinks(names, from) {
  if (!names.length) return 'None.';
  return names.map(name => `[${name}](${from}${name}/SPEC.md)`).join(', ');
}

/**
 * Returns { outputs, problems }. outputs maps repository-relative paths to the
 * content they should have; problems lists things a person has to fix.
 */
export async function generateDependencyDocs(root) {
  const featureRoot = join(root, 'features');
  const problems = [];
  let names = [];
  if (await exists(featureRoot)) {
    names = (await readdir(featureRoot, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => entry.name)
      .sort();
  }

  const specs = new Map();
  for (const name of names) {
    try {
      specs.set(name, await readFile(join(featureRoot, name, 'SPEC.md'), 'utf8'));
    } catch {
      problems.push(`features/${name}/ has no SPEC.md. Start from docs/feature-spec-template.md.`);
    }
  }

  const uses = new Map(names.map(name => [name, new Set()]));
  const modules = [];
  for (const name of names) {
    for (const file of await walk(join(featureRoot, name))) {
      if (!CODE.test(file)) continue;
      const imports = new Set();
      for (const match of (await readFile(file, 'utf8')).matchAll(IMPORT)) {
        const target = await resolveImport(root, file, match[1]);
        imports.add(target);
        const [top, other] = target.split('/');
        if (top === 'features' && other !== name && uses.has(other)) uses.get(name).add(other);
      }
      modules.push({ path: toPosix(relative(root, file)), imports: [...imports].sort() });
    }
  }

  const usedBy = new Map(names.map(name => [name, new Set()]));
  for (const [name, targets] of uses) for (const target of targets) usedBy.get(target).add(name);
  const sorted = map => name => [...map.get(name)].sort();
  const usesOf = sorted(uses);
  const usedByOf = sorted(usedBy);

  const graph = names.length
    ? ['```mermaid', 'flowchart TD',
        ...names.map(name => `  ${name}["${escapeLabel(featureTitle(name, specs.get(name)))}"]`),
        ...names.flatMap(name => usesOf(name).map(target => `  ${name} --> ${target}`)),
        '```'].join('\n')
    : '_No features yet. Add a folder under `features/` with a SPEC.md._';
  const featureRows = names.map(name =>
    `| [${escapeLabel(featureTitle(name, specs.get(name)))}](features/${name}/SPEC.md) | ${usesOf(name).join(', ') || '—'} | ${usedByOf(name).join(', ') || '—'} |`);
  const moduleRows = modules.map(({ path, imports }) =>
    `| \`${path}\` | ${imports.length ? imports.map(target => `\`${target}\``).join(', ') : '—'} |`);

  const outputs = new Map();
  outputs.set('DEPENDENCIES.md', [
    '# Dependencies',
    '',
    'Generated by `npm run docs:dependencies` from the relative imports in `features/`. Do not edit it by hand: `npm run check` fails when it is out of date.',
    '',
    '## Features',
    '',
    'An arrow points from a feature to a feature it imports. Before changing a feature, check what uses it.',
    '',
    graph,
    '',
    ...(names.length ? ['| Feature | Uses | Used by |', '| --- | --- | --- |', ...featureRows, ''] : []),
    '## Modules',
    '',
    ...(modules.length
      ? ['| File | Relative imports |', '| --- | --- |', ...moduleRows]
      : ['_No code files yet._']),
    '',
  ].join('\n'));

  for (const name of names) {
    const spec = specs.get(name);
    if (spec === undefined) continue;
    const section = [
      START,
      '## Dependencies',
      '',
      'Generated by `npm run docs:dependencies`; see the [project dependency map](../../DEPENDENCIES.md).',
      '',
      `- **Uses:** ${featureLinks(usesOf(name), '../')}`,
      `- **Used by:** ${featureLinks(usedByOf(name), '../')}`,
      END,
    ].join('\n');
    const start = spec.indexOf(START);
    const end = spec.indexOf(END);
    if ((start < 0) !== (end < 0) || end < start) {
      problems.push(`features/${name}/SPEC.md has a broken dependencies section. Delete it and run npm run docs:dependencies.`);
      continue;
    }
    const next = start < 0
      ? `${spec.trimEnd()}\n\n${section}\n`
      : spec.slice(0, start) + section + spec.slice(end + END.length);
    outputs.set(`features/${name}/SPEC.md`, next);
  }

  return { outputs, problems };
}

/** Lists generated files whose content on disk differs from what they should be. */
export async function staleDependencyDocs(root) {
  const { outputs, problems } = await generateDependencyDocs(root);
  const stale = [];
  for (const [path, content] of outputs) {
    let current;
    try { current = await readFile(join(root, path), 'utf8'); } catch { /* missing counts as stale */ }
    if (current !== content) stale.push(path);
  }
  return { stale, problems };
}

export async function writeDependencyDocs(root) {
  const { outputs, problems } = await generateDependencyDocs(root);
  const written = [];
  for (const [path, content] of outputs) {
    let current;
    try { current = await readFile(join(root, path), 'utf8'); } catch { /* write it */ }
    if (current === content) continue;
    await writeFile(join(root, path), content);
    written.push(path);
  }
  return { written, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--check')) {
    const { stale, problems } = await staleDependencyDocs(root);
    for (const problem of problems) console.error(problem);
    if (stale.length) console.error(`Out of date: ${stale.join(', ')}. Run npm run docs:dependencies.`);
    if (problems.length || stale.length) process.exit(1);
    console.log('Dependency docs are current.');
  } else {
    const { written, problems } = await writeDependencyDocs(root);
    for (const problem of problems) console.error(problem);
    console.log(written.length ? `Updated ${written.join(', ')}.` : 'Dependency docs were already current.');
    if (problems.length) process.exit(1);
  }
}
