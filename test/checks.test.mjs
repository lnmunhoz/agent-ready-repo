import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkChangelog, checkFeatureSpec, checkMemory, checkSkillCopies, checkTodos, markdownLinks, MEMORY_MAX_LINES } from '../scripts/check.mjs';
import { staleDependencyDocs, writeDependencyDocs } from '../scripts/dependencies.mjs';

const spec = title => `# ${title}\n\nSummary.\n\n## Behavior\n\n- Works.\n\n## Boundaries\n\n- Small.\n\n## Verification\n\nRun tests.\n`;

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), 'agent-ready-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

test('TODOS.md: finished items belong under Completed and unfinished under Open', () => {
  assert.deepEqual(checkTodos('## Open\n\n- [ ] a\n\n## Completed\n\n- [x] b\n'), []);
  assert.equal(checkTodos('## Open\n\n- [x] done\n\n## Completed\n').length, 1);
  assert.equal(checkTodos('## Open\n\n## Completed\n\n- [ ] not done\n').length, 1);
  assert.equal(checkTodos('## Open\n').length, 1);
});

test('CHANGELOG.md: dated sections, newest first, each date once', () => {
  assert.deepEqual(checkChangelog('# Changelog\n\n## 2026-02-01\n\n- b\n\n## 2026-01-01\n\n- a\n'), []);
  assert.match(checkChangelog('## 2026-01-01\n\n## 2026-02-01\n').join(), /newest date first/);
  assert.match(checkChangelog('## 2026-01-01\n\n## 2026-01-01\n').join(), /appears twice/);
  assert.match(checkChangelog('## Unreleased\n').join(), /should be a date/);
});

test('MEMORY.md entries are dated and the file stays short', () => {
  assert.deepEqual(checkMemory('# Project memory\n\n## Gotchas\n\n- **2026-01-31** · Ports below 1024 need root.\n  Continuation lines are fine.\n'), []);
  assert.match(checkMemory('## Gotchas\n\n- Ports below 1024 need root.\n').join(), /entries start with/);
  assert.match(checkMemory('\n'.repeat(MEMORY_MAX_LINES)).join(), /limit 150/);
});

test('feature SPEC.md needs a title and non-empty standard sections', () => {
  assert.deepEqual(checkFeatureSpec('x', spec('Tasks')), []);
  const problems = checkFeatureSpec('x', '# Tasks\n\n## Behavior\n\n## Boundaries\n\n- a\n');
  assert.deepEqual(problems, ['x: "## Behavior" is empty.', 'x needs a "## Verification" section.']);
});

test('markdown links skip URLs, anchors and code', () => {
  const links = markdownLinks('[a](AGENTS.md) [b](https://x.dev) [c](#top) [d](docs/x.md#part) `[e](nope.md)`\n```\n[f](nope.md)\n```');
  assert.deepEqual(links, ['AGENTS.md', 'docs/x.md']);
});

test('dependency docs map imports between features and list who uses each feature', async () => {
  const root = await fixture({
    'features/tasks/SPEC.md': spec('Tasks'),
    'features/tasks/tasks.mts': 'export const x = 1;\n',
    'features/cli/SPEC.md': spec('Command line'),
    'features/cli/main.mjs': "import { x } from '../tasks/tasks.mjs';\nimport './format.mjs';\n",
    'features/cli/format.mjs': 'export {};\n',
  });
  try {
    assert.deepEqual((await staleDependencyDocs(root)).stale.sort(),
      ['DEPENDENCIES.md', 'features/cli/SPEC.md', 'features/tasks/SPEC.md']);
    await writeDependencyDocs(root);
    assert.deepEqual(await staleDependencyDocs(root), { stale: [], problems: [] });

    const map = await readFile(join(root, 'DEPENDENCIES.md'), 'utf8');
    assert.match(map, /cli --> tasks/);
    assert.match(map, /`features\/cli\/main\.mjs` \| `features\/cli\/format\.mjs`, `features\/tasks\/tasks\.mts`/);
    assert.match(await readFile(join(root, 'features/tasks/SPEC.md'), 'utf8'), /\*\*Used by:\*\* \[cli\]\(\.\.\/cli\/SPEC\.md\)/);

    await writeFile(join(root, 'features/cli/main.mjs'), "import './format.mjs';\n");
    assert.ok((await staleDependencyDocs(root)).stale.includes('DEPENDENCIES.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a feature folder without SPEC.md is reported', async () => {
  const root = await fixture({ 'features/orphan/index.mjs': 'export {};\n' });
  try {
    assert.match((await staleDependencyDocs(root)).problems.join(), /features\/orphan\/ has no SPEC\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('skill copies for Claude Code and Codex must match', async () => {
  const root = await fixture({
    '.claude/skills/todo/SKILL.md': 'one',
    '.agents/skills/todo/SKILL.md': 'two',
    '.claude/skills/extra/SKILL.md': 'only here',
  });
  try {
    assert.deepEqual(await checkSkillCopies(root), [
      '.claude/skills/extra/SKILL.md has no copy in .agents/skills/.',
      'Skill copies differ: .claude/skills/todo/SKILL.md and .agents/skills/todo/SKILL.md.',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
