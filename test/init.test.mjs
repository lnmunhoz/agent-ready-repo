import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProject, nextSteps, packageName, parseArgs } from '../bin/init.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cwd, args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

async function withFolder(fn) {
  const folder = await mkdtemp(join(tmpdir(), 'agent-ready-init-'));
  try { await fn(folder); } finally { await rm(folder, { recursive: true, force: true }); }
}

// Replaces every setup note with real content, as an agent would.
async function finishSetup(root, notes) {
  for (const file of new Set(notes.map(note => note.match(/^Finish setup in (\S+):/)[1]))) {
    const text = await readFile(join(root, file), 'utf8');
    await writeFile(join(root, file), text.replace(/<!--\s*setup:[\s\S]*?-->/g, 'Written by the agent.'));
  }
}

test('arguments: folder, --name and --description, with or without =', () => {
  assert.deepEqual(parseArgs(['app', '--name', 'EMOM Timer', '--description=Counts rounds.']),
    { folder: 'app', name: 'EMOM Timer', description: 'Counts rounds.', help: false });
  assert.throws(() => parseArgs(['--name']), /--name needs a value/);
  assert.throws(() => parseArgs(['--force']), /Unknown option --force/);
  assert.equal(packageName('EMOM Timer (iOS)'), 'emom-timer-ios');
});

test('a new project is filled in, generated and lists only what an agent must write', async () => {
  await withFolder(async folder => {
    const project = await createProject({ folder, name: 'EMOM Timer', description: 'Counts EMOM rounds.', date: '2026-11-06', git: false });

    for (const path of ['.gitignore', '.claude/skills/todo/SKILL.md', '.agents/skills/todo/SKILL.md', '.github/workflows/check.yml', 'DEPENDENCIES.md', 'features/.gitkeep']) {
      assert.ok(project.files.includes(path) || path === 'DEPENDENCIES.md', path);
      await readFile(join(folder, path));
    }
    assert.match(await readFile(join(folder, 'AGENTS.md'), 'utf8'), /^# Working on EMOM Timer\n\nCounts EMOM rounds\./);
    assert.match(await readFile(join(folder, 'CHANGELOG.md'), 'utf8'), /## 2026-11-06/);
    assert.equal(JSON.parse(await readFile(join(folder, 'package.json'), 'utf8')).name, 'emom-timer');

    assert.equal(project.notes.length, 3);
    assert.deepEqual(project.notes.map(note => note.match(/in (\S+):/)[1]), ['AGENTS.md', 'README.md', 'SPEC.md']);
    assert.match(nextSteps(project), /AGENTS\.md: Expand the paragraph/);

    const before = run(folder, ['scripts/check.mjs']);
    assert.equal(before.status, 1);
    assert.match(before.stderr, /^3 problems:/);

    await finishSetup(folder, project.notes);
    const after = run(folder, ['scripts/check.mjs']);
    assert.equal(after.status, 0, after.stderr);
    const tests = run(folder, ['--test']);
    assert.equal(tests.status, 0, tests.stdout + tests.stderr);
  });
});

test('without a description, a setup note marks where to write one', async () => {
  await withFolder(async folder => {
    const project = await createProject({ folder, name: 'App', git: false });
    assert.equal(project.notes.filter(note => /Describe the project/.test(note)).length, 3);
  });
});

test('nothing is overwritten: an existing file stops the whole run', async () => {
  await withFolder(async folder => {
    await writeFile(join(folder, 'README.md'), 'mine');
    await writeFile(join(folder, 'notes.txt'), 'keep');
    await assert.rejects(createProject({ folder, git: false }), /already exist, so nothing was changed: README\.md/);
    assert.deepEqual((await readdir(folder)).sort(), ['README.md', 'notes.txt']);
    assert.equal(await readFile(join(folder, 'README.md'), 'utf8'), 'mine');
  });
});

test('the command line creates the project and prints the next steps', async () => {
  await withFolder(async folder => {
    const result = run(folder, [join(repo, 'bin/init.mjs'), 'app', '--name', 'Demo']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Created Demo in app from agent-ready-repo\./);
    assert.match(result.stdout, /Nothing has been committed or published\./);
    assert.ok(spawnSync('git', ['rev-parse', '--git-dir'], { cwd: join(folder, 'app') }).status === 0, 'git init ran');
  });
});

test('the example features work in a new project, and their generated files are current', async () => {
  await withFolder(async folder => {
    const project = await createProject({ folder, name: 'Example', description: 'The template example.', git: false });
    await finishSetup(folder, project.notes);
    await cp(join(repo, 'example/features'), join(folder, 'features'), { recursive: true });
    await cp(join(repo, 'example/test'), join(folder, 'test'), { recursive: true });

    const generate = run(folder, ['scripts/generate-docs.mjs']);
    assert.equal(generate.status, 0, generate.stderr);
    for (const file of ['tasks/SPEC.md', 'tasks/CLAUDE.md', 'cli/SPEC.md', 'cli/CLAUDE.md']) {
      assert.equal(await readFile(join(folder, 'features', file), 'utf8'),
        await readFile(join(repo, 'example/features', file), 'utf8'), `example/features/${file} is out of date`);
    }
    assert.equal(run(folder, ['scripts/check.mjs']).status, 0);
    const tests = run(folder, ['--test']);
    assert.equal(tests.status, 0, tests.stdout + tests.stderr);
  });
});

test('links in the explainer documents resolve', async () => {
  const { markdownLinks } = await import('../template/scripts/check.mjs');
  const files = ['README.md', 'AGENTS.md', ...(await readdir(join(repo, 'docs'))).map(name => `docs/${name}`)];
  for (const file of files) {
    for (const target of markdownLinks(await readFile(join(repo, file), 'utf8'))) {
      await assert.doesNotReject(readFile(join(repo, dirname(file), target)).catch(async error => {
        if (error.code === 'EISDIR') return;
        throw new Error(`${file}: broken link to ${target}`);
      }));
    }
  }
});
