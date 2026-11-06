import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProject, nextSteps, packageName, parseArgs } from '../bin/init.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Node marks processes started by a test run with NODE_TEST_CONTEXT, and a
// nested `node --test` then reports success even when its tests fail. Drop it so
// the created project's tests really run.
const { NODE_TEST_CONTEXT, ...cleanEnv } = process.env;
const run = (cwd, args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: cleanEnv });

async function withFolder(fn) {
  const folder = await mkdtemp(join(tmpdir(), 'agent-ready-init-'));
  try { await fn(folder); } finally { await rm(folder, { recursive: true, force: true }); }
}

// Replaces every setup note with real content, as an agent would.
async function finishSetup(root, notes) {
  for (const file of new Set(notes.map(note => note.match(/^Finish setup in (\S+):/)?.[1]).filter(Boolean))) {
    const text = await readFile(join(root, file), 'utf8');
    await writeFile(join(root, file), text.replace(/<!--\s*setup:[\s\S]*?-->/g, 'Written by the agent.'));
  }
}

test('arguments: folder, --name and --description, with or without =', () => {
  assert.deepEqual(parseArgs(['app', '--name', 'EMOM Timer', '--description=Counts rounds.']),
    { folder: 'app', name: 'EMOM Timer', description: 'Counts rounds.', existing: false, help: false });
  assert.equal(parseArgs(['--existing']).existing, true);
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

test('--existing keeps the project\'s files, merges what it safely can and marks the rest', async () => {
  await withFolder(async folder => {
    await writeFile(join(folder, 'README.md'), '# My app\n\nRun it with expo start.\n');
    await writeFile(join(folder, 'package.json'), JSON.stringify({ name: 'my-app', scripts: { test: 'jest', start: 'expo start' } }, null, 2));
    await writeFile(join(folder, '.gitignore'), 'node_modules/\n.expo/\n');
    await writeFile(join(folder, 'CLAUDE.md'), 'Use pnpm.\n');
    spawnSync('git', ['init', '-q'], { cwd: folder });

    const project = await createProject({ folder, name: 'My app', description: 'A phone app.', existing: true });
    const merged = Object.fromEntries(project.merged.map(({ path, how }) => [path, how]));
    assert.deepEqual(Object.keys(merged).sort(), ['.gitignore', 'CLAUDE.md', 'README.md', 'package.json']);
    assert.match(merged['package.json'], /added the check, docs:generate scripts/);

    const pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts.test, 'jest');
    assert.equal(pkg.scripts.check, 'node scripts/check.mjs');
    assert.equal(await readFile(join(folder, 'CLAUDE.md'), 'utf8'), 'Use pnpm.\n\n@AGENTS.md\n@MEMORY.md\n');
    const ignore = await readFile(join(folder, '.gitignore'), 'utf8');
    assert.match(ignore, /^node_modules\/\n\.expo\/\n\n# Added by agent-ready-repo\n/);
    assert.equal(ignore.match(/node_modules/g).length, 1);
    const readme = await readFile(join(folder, 'README.md'), 'utf8');
    assert.match(readme, /^# My app\n\nRun it with expo start\.\n\n<!-- setup: This file existed before/);
    assert.match(await readFile(join(folder, '.agent-ready-merge/README.md'), 'utf8'), /^# My app\n\nA phone app\./);

    const notes = project.notes.join('\n');
    assert.match(notes, /Finish setup in README\.md: This file existed before agent-ready-repo was added/);
    assert.match(notes, /merge the template's versions in \.agent-ready-merge\/ into your own files \(README\.md\)/);
    assert.match(nextSteps(project), /Added agent-ready-repo to My app/);

    await finishSetup(folder, project.notes);
    await rm(join(folder, '.agent-ready-merge'), { recursive: true });
    const check = run(folder, ['scripts/check.mjs']);
    assert.equal(check.status, 0, check.stderr);
  });
});

test('--existing stops before changing anything when the project has its own check scripts', async () => {
  await withFolder(async folder => {
    await mkdir(join(folder, 'scripts'));
    await writeFile(join(folder, 'scripts/check.mjs'), 'console.log("lint");\n');
    await writeFile(join(folder, 'README.md'), '# Mine\n');
    await assert.rejects(createProject({ folder, git: false, existing: true }), /already has scripts\/check\.mjs, so nothing was changed/);
    assert.deepEqual((await readdir(folder)).sort(), ['README.md', 'scripts']);
    assert.deepEqual(await readdir(join(folder, 'scripts')), ['check.mjs']);
    assert.equal(await readFile(join(folder, 'README.md'), 'utf8'), '# Mine\n');
  });
});

test('a folder that cannot be written is reported, and everything else is still created', async () => {
  await withFolder(async folder => {
    await mkdir(join(folder, '.agents'));
    await chmod(join(folder, '.agents'), 0o555);
    try {
      const project = await createProject({ folder, name: 'Sandboxed', description: 'x', git: false });
      assert.deepEqual(project.failed.map(({ path }) => path), ['.agents/skills/todo/SKILL.md']);
      assert.ok(project.files.includes('AGENTS.md'));
      assert.match(nextSteps(project), /Couldn't write \.agents\/skills\/todo\/SKILL\.md .*copy \.claude\/skills\/todo\/SKILL\.md there/);
    } finally {
      await chmod(join(folder, '.agents'), 0o755);
    }
  });
});

test('template files that mention placeholders on purpose are copied unchanged', async () => {
  await withFolder(async folder => {
    await createProject({ folder, name: 'EMOM Timer', description: 'x', git: false });
    assert.equal(await readFile(join(folder, 'test/checks.test.mjs'), 'utf8'),
      await readFile(join(repo, 'template/test/checks.test.mjs'), 'utf8'));
  });
});

test('an existing file stops the run with a pointer to --existing', async () => {
  await withFolder(async folder => {
    await writeFile(join(folder, 'package.json'), '{}');
    await assert.rejects(createProject({ folder, git: false }), /run the same command with --existing/);
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
    await cp(join(repo, 'example/SPEC.md'), join(folder, 'SPEC.md'));
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

test('links in the explainer documents resolve, including links to headings', async () => {
  const { headingAnchors, markdownLinkTargets } = await import('../template/scripts/check.mjs');
  const files = ['README.md', 'AGENTS.md', 'CHANGELOG.md', 'example/SPEC.md', ...(await readdir(join(repo, 'docs'))).map(name => `docs/${name}`)];
  for (const file of files) {
    for (const { path, anchor } of markdownLinkTargets(await readFile(join(repo, file), 'utf8'))) {
      const target = path ? join(repo, dirname(file), path) : join(repo, file);
      let text;
      try { text = await readFile(target, 'utf8'); } catch (error) {
        if (error.code === 'EISDIR') continue;
        throw new Error(`${file}: broken link to ${path}`);
      }
      if (anchor && target.endsWith('.md')) assert.ok(headingAnchors(text).has(anchor.toLowerCase()), `${file}: no heading for ${path}#${anchor}`);
    }
  }
});
