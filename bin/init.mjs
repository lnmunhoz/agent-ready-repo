#!/usr/bin/env node
// Creates a new agent-ready project from template/.
//
//   npx -y github:lnmunhoz/agent-ready-repo [folder] --name "My App" --description "One or two sentences."
//
// Copies the template without overwriting anything, fills in the name, package
// name, date and description, generates the derived docs, runs `git init` when
// the folder isn't a repository yet, and prints what is left to write.

import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TEMPLATE = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'template');
const DESCRIPTION_NOTE = '<!-- setup: Describe the project in one or two sentences: what it is and who it is for. Then delete this comment. -->';
// npm drops files named .gitignore from packages, so the template stores it without the dot.
const RENAMES = new Map([['gitignore', '.gitignore']]);
const USAGE = `Create a project that coding agents can find their way around.

Usage:
  npx -y github:lnmunhoz/agent-ready-repo [folder] --name "My App" --description "What it is, in one or two sentences."

  folder         Where to create the project (default: the current folder). It may
                 already exist and hold other files; nothing is overwritten.
  --name         The project's display name (default: the folder name).
  --description  One or two sentences about the project. Without it, a setup note
                 marks where to write one.`;

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(join(dir, entry.name)) : [join(dir, entry.name)]));
  return nested.flat().sort();
}

export function parseArgs(argv) {
  const options = { folder: '.', name: undefined, description: undefined, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.split(/=(.*)/s);
    const value = () => {
      const next = inline ?? argv[++i];
      if (next === undefined || !next.trim() || (inline === undefined && next.startsWith('--'))) throw new Error(`${flag} needs a value.`);
      return next;
    };
    if (arg === '-h' || arg === '--help') options.help = true;
    else if (flag === '--name') options.name = value();
    else if (flag === '--description') options.description = value();
    else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.`);
    else options.folder = arg;
  }
  return options;
}

export function packageName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function localDate(now = new Date()) {
  const pad = number => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function fill(text, values) {
  let result = text;
  for (const [key, value] of Object.entries(values)) result = result.split(`{{${key}}}`).join(value);
  return result;
}

/** Creates the project and returns { root, files, notes }. Throws, writing nothing, if a file would be overwritten. */
export async function createProject({ folder = '.', name, description, date = localDate(), git = true } = {}) {
  const root = resolve(folder);
  const displayName = name?.trim() || basename(root);
  const values = {
    name: displayName,
    package: packageName(displayName),
    description: description?.trim() || DESCRIPTION_NOTE,
    date,
  };

  const sources = await walk(TEMPLATE);
  const targets = sources.map(source => {
    const parts = relative(TEMPLATE, source).split(sep);
    parts[parts.length - 1] = RENAMES.get(parts.at(-1)) ?? parts.at(-1);
    return { source, path: parts.join('/') };
  });
  const conflicts = [];
  for (const { path } of targets) if (await exists(join(root, path))) conflicts.push(path);
  if (conflicts.length) {
    throw new Error(`These files already exist, so nothing was changed: ${conflicts.join(', ')}.`);
  }

  for (const { source, path } of targets) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), fill(await readFile(source, 'utf8'), values));
  }

  const generator = await import(pathToFileURL(join(root, 'scripts', 'generate-docs.mjs')).href);
  await generator.writeDocs(root);

  if (git && !await exists(join(root, '.git'))) spawnSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' });

  const check = await import(pathToFileURL(join(root, 'scripts', 'check.mjs')).href);
  const notes = await check.checkSetup(root);
  return { root, files: targets.map(target => target.path), notes, name: displayName };
}

export function nextSteps({ root, name, notes }) {
  const where = relative(process.cwd(), root) || 'the current folder';
  return [
    `Created ${name} in ${where} from agent-ready-repo.`,
    '',
    'Next steps, for you or your agent:',
    '1. Fill in what only you know. `npm run check` lists these until they are done:',
    ...notes.map(note => `   - ${note.replace(/^Finish setup in /, '')}`),
    '2. Run `npm test` and `npm run check`. Both should pass, with nothing left to fill in.',
    '3. Review the files and make the first commit. Nothing has been committed or published.',
    '',
    'Then follow AGENTS.md: add each feature under features/ with its own SPEC.md and MEMORY.md.',
    'The project has no license file; add one before publishing it.',
  ].join('\n');
}

// npx runs this file through a symlink, so compare real paths.
const isMain = (() => {
  try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(USAGE);
    } else {
      console.log(nextSteps(await createProject(options)));
    }
  } catch (error) {
    console.error(error.message);
    console.error('\nRun with --help for usage.');
    process.exit(1);
  }
}
