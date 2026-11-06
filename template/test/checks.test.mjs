import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkChangelog, checkDeclaredInterfaces, checkFeatureSpec, checkLinks, checkMemory, checkSetup, checkSkillCopies, checkStoryLinks, checkTodos, headingAnchors, interfaceCompleteness, markdownLinks, markdownLinkTargets, MEMORY_MAX_LINES, setupNotes } from '../scripts/check.mjs';
import { FEATURE_CLAUDE_MD, mentions, nodeLabel, staleDocs, writeDocs } from '../scripts/generate-docs.mjs';

test('long diagram labels wrap so GitHub does not clip them', () => {
  assert.equal(nodeLabel('Terminal (standard output)'), 'Terminal<br/>(standard<br/>output)');
  assert.equal(nodeLabel('Tasks'), 'Tasks');
  assert.equal(nodeLabel('Say "hi" to the very long name'), 'Say &quot;hi&quot; to<br/>the very long<br/>name');
});

test('setup notes and unreplaced placeholders are listed until they are filled in', async () => {
  assert.deepEqual(setupNotes('a <!-- setup: Write the\n  user stories. --> b <!-- other -->'), ['Write the user stories.']);
  const root = await fixture({
    'SPEC.md': '# {{name}}\n\n<!-- setup: Write the user stories. -->\n',
    'package.json': '{ "name": "{{package}}" }\n',
    'notes.mjs': '// {{name}} in code is ignored\n',
  });
  try {
    assert.deepEqual(await checkSetup(root), [
      'Finish setup in SPEC.md: Write the user stories.',
      'Finish setup in SPEC.md: replace {{name}}.',
      'Finish setup in package.json: replace {{package}}.',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const interfaces = ({ serves = 'None.', handles = 'None.', external = 'None.' } = {}) =>
  `## Interfaces\n\n- **Serves:** ${serves}\n- **Handles:** ${handles}\n- **Stores:** None.\n- **Uses:** None.\n- **External:** ${external}\n\n`;
const spec = (title, lines) => `# ${title}\n\nSummary.\n\n## Behavior\n\n- Works.\n\n${interfaces(lines)}## Boundaries\n\n- Small.\n\n## Verification\n\nRun tests.\n`;

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
  assert.match(checkMemory('- x\n', 'features/tasks/MEMORY.md', 80).join(), /^features\/tasks\/MEMORY\.md: entries/);
});

test('feature SPEC.md needs a title and non-empty standard sections', () => {
  assert.deepEqual(checkFeatureSpec('x', spec('Tasks')), []);
  const problems = checkFeatureSpec('x', '# Tasks\n\n## Behavior\n\n## Boundaries\n\n- a\n');
  assert.deepEqual(problems, ['x: "## Behavior" is empty.', 'x needs a "## Interfaces" section.', 'x needs a "## Verification" section.']);
  const partial = spec('Tasks').replace('- **Stores:** None.\n', '');
  assert.deepEqual(checkFeatureSpec('x', partial), ['x: Interfaces needs a "- **Stores:** …" line (write "None." when there is nothing).']);
});

test('markdown links skip URLs, anchors and code', () => {
  const links = markdownLinks('[a](AGENTS.md) [b](https://x.dev) [c](#top) [d](docs/x.md#part) `[e](nope.md)`\n```\n[f](nope.md)\n```');
  assert.deepEqual(links, ['AGENTS.md', 'docs/x.md']);
});

test('generated docs map imports between features and list who uses each feature', async () => {
  const root = await fixture({
    'MEMORY.md': '# Project memory\n',
    'features/tasks/SPEC.md': spec('Tasks'),
    'features/tasks/MEMORY.md': '# Tasks memory\n\n## Gotchas\n\n- **2026-01-02** · b\n- **2026-01-01** · a\n',
    'features/tasks/tasks.mts': 'export const x = 1;\n',
    'features/cli/SPEC.md': spec('Command line'),
    'features/cli/MEMORY.md': '# Command line memory\n',
    'features/cli/main.mjs': "import { x } from '../tasks/tasks.mjs';\nimport './format.mjs';\n",
    'features/cli/format.mjs': 'export {};\n',
  });
  try {
    assert.deepEqual((await staleDocs(root)).stale.sort(), [
      'DEPENDENCIES.md', 'MEMORY.md', 'features/cli/CLAUDE.md', 'features/cli/SPEC.md',
      'features/tasks/CLAUDE.md', 'features/tasks/SPEC.md',
    ]);
    await writeDocs(root);
    assert.deepEqual(await staleDocs(root), { stale: [], problems: [] });

    const map = await readFile(join(root, 'DEPENDENCIES.md'), 'utf8');
    assert.match(map, /f_cli --> f_tasks/);
    assert.match(map, /`features\/cli\/main\.mjs` \| `features\/cli\/format\.mjs`, `features\/tasks\/tasks\.mts`/);
    assert.match(await readFile(join(root, 'features/tasks/SPEC.md'), 'utf8'), /\*\*Used by:\*\* \[cli\]\(\.\.\/cli\/SPEC\.md\) \(imports it\)/);

    await writeFile(join(root, 'features/cli/main.mjs'), "import './format.mjs';\n");
    assert.ok((await staleDocs(root)).stale.includes('DEPENDENCIES.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('each feature gets a CLAUDE.md that loads its spec and memory, and the root memory indexes them', async () => {
  const root = await fixture({
    'MEMORY.md': '# Project memory\n\n## Gotchas\n\n- **2026-01-01** · root fact\n',
    'features/tasks/SPEC.md': spec('Tasks'),
    'features/tasks/MEMORY.md': '# Tasks memory\n\n- **2026-01-02** · newer\n- **2026-01-01** · older\n',
  });
  try {
    await writeDocs(root);
    assert.equal(await readFile(join(root, 'features/tasks/CLAUDE.md'), 'utf8'), FEATURE_CLAUDE_MD);
    assert.match(FEATURE_CLAUDE_MD, /^@SPEC\.md$/m);
    assert.match(FEATURE_CLAUDE_MD, /^@MEMORY\.md$/m);
    const memory = await readFile(join(root, 'MEMORY.md'), 'utf8');
    assert.match(memory, /root fact/);
    assert.match(memory, /\| \[Tasks\]\(features\/tasks\/MEMORY\.md\) \| 2 \| 2026-01-02 \|/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a feature folder without SPEC.md or MEMORY.md is reported', async () => {
  const root = await fixture({ 'features/orphan/index.mjs': 'export {};\n' });
  try {
    const { problems } = await staleDocs(root);
    assert.match(problems.join(), /features\/orphan\/ has no SPEC\.md/);
    assert.match(problems.join(), /features\/orphan\/ has no MEMORY\.md/);
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

test('runtime calls come from Serves and Handles, and every feature spec gets a diagram', async () => {
  const root = await fixture({
    'MEMORY.md': '# Project memory\n',
    'features/api/SPEC.md': spec('API', { serves: '`/api/tasks`, `/api/users`.', external: 'Postgres (task rows); Stripe API.' }),
    'features/api/MEMORY.md': '# m\n',
    'features/api/server.mjs': "export const routes = ['/api/tasks', '/api/users'];\n",
    'features/web/SPEC.md': spec('Web app'),
    'features/web/MEMORY.md': '# m\n',
    'features/web/page.mjs': "fetch('/api/tasks');\n",
  });
  try {
    await writeDocs(root);
    const api = await readFile(join(root, 'features/api/SPEC.md'), 'utf8');
    assert.match(api, /- \*\*Used by:\*\* \[web\]\(\.\.\/web\/SPEC\.md\) \(calls `\/api\/tasks`\)/);
    assert.match(api, /- \*\*Outside services:\*\* Postgres \(task rows\); Stripe API/);
    assert.ok(api.includes('  f_web -.->|"/api/tasks"| f_api'));
    assert.ok(api.includes('  subgraph outside_f_api["Outside this project"]'));
    assert.ok(api.includes('    ext_f_api_0["Postgres (task<br/>rows)"]'));
    assert.ok(api.includes('    ext_f_api_1["Stripe API"]'));
    const web = await readFile(join(root, 'features/web/SPEC.md'), 'utf8');
    assert.match(web, /- \*\*Calls:\*\* \[api\]\(\.\.\/api\/SPEC\.md\) \(`\/api\/tasks`\)/);
    assert.match(web, /```mermaid\nflowchart TD\n  f_web\["Web app"\]\n  style f_web stroke-width:3px\n/);
    assert.ok((await readFile(join(root, 'DEPENDENCIES.md'), 'utf8')).includes('  f_web -.->|"/api/tasks"| f_api'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a feature used by many others shows them as one node, and a route has one owner', async () => {
  const files = { 'MEMORY.md': '# m\n', 'features/core/SPEC.md': spec('Core', { handles: '`refresh`.' }), 'features/core/MEMORY.md': '# m\n', 'features/core/core.mjs': 'export {};\n' };
  for (let i = 0; i < 13; i += 1) {
    files[`features/user${i}/SPEC.md`] = spec(`User ${i}`);
    files[`features/user${i}/MEMORY.md`] = '# m\n';
    files[`features/user${i}/index.mjs`] = "import '../core/core.mjs';\n";
  }
  files['features/user0/SPEC.md'] = spec('User 0', { handles: '`refresh`.' });
  const root = await fixture(files);
  try {
    const { problems } = await writeDocs(root);
    assert.deepEqual(problems, ['`refresh` is listed under Serves or Handles in both features/core and features/user0; exactly one feature must own it.']);
    const core = await readFile(join(root, 'features/core/SPEC.md'), 'utf8');
    assert.ok(core.includes('  used_by_f_core["Used by 13 features"]'));
    assert.ok(!core.includes('f_user0["User 0"]'));
    assert.match(core, /\[user12\]\(\.\.\/user12\/SPEC\.md\) \(imports it\)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime calls match whole routes and names, not parts of longer ones', () => {
  assert.ok(mentions("fetch('/api/tasks?done=1')", '/api/tasks'));
  assert.ok(!mentions("fetch('/api/tasks/archive')", '/api/tasks'));
  assert.ok(mentions("fetch('/api/files/report.pdf')", '/api/files/'));
  assert.ok(mentions("emit('save')", 'save'));
  assert.ok(!mentions('autosave();', 'save'));
  assert.ok(!mentions("on('task-completed-all')", 'task-completed'));
  assert.ok(mentions('send({ type: START_FOCUS })', 'START_FOCUS'));
});

test('a route listed by one feature is not drawn as called by code that only names a longer route', async () => {
  const root = await fixture({
    'MEMORY.md': '# m\n',
    'features/api/SPEC.md': spec('API', { serves: '`/api/tasks`.' }),
    'features/api/MEMORY.md': '# m\n',
    'features/archive/SPEC.md': spec('Archive', { serves: '`/api/tasks/archive`.' }),
    'features/archive/MEMORY.md': '# m\n',
    'features/web/SPEC.md': spec('Web'),
    'features/web/MEMORY.md': '# m\n',
    'features/web/page.mjs': "fetch('/api/tasks/archive');\n",
  });
  try {
    await writeDocs(root);
    const web = await readFile(join(root, 'features/web/SPEC.md'), 'utf8');
    assert.ok(web.includes('  f_web -.->|"/api/tasks/archive"| f_archive'));
    assert.match(web, /- \*\*Calls:\*\* \[archive\]\(\.\.\/archive\/SPEC\.md\) \(`\/api\/tasks\/archive`\)\n/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('declared routes and messages must each be listed by a feature, and listed ones must exist', () => {
  const specs = new Map([['api', spec('API', { serves: '`/api/tasks`, `/api/old`.', handles: '`anything`.' })]]);
  assert.deepEqual(interfaceCompleteness(null, specs), []);
  assert.deepEqual(interfaceCompleteness({ serves: ['/api/tasks', '/api/old'] }, specs), []);
  assert.deepEqual(interfaceCompleteness({ serves: ['/api/tasks', '/api/users'] }, specs), [
    '`/api/users` is defined in the code but no feature lists it under Serves.',
    'features/api/SPEC.md lists `/api/old` under Serves, but scripts/declared-interfaces.mjs doesn\'t define it.',
  ]);
  assert.deepEqual(interfaceCompleteness({ handles: 'save' }, specs), ['scripts/declared-interfaces.mjs: "handles" must be a list of strings.']);
});

test('the declared-interfaces hook is read from the project', async () => {
  const root = await fixture({
    'scripts/declared-interfaces.mjs': "export async function declaredInterfaces() { return { serves: ['/api/tasks', '/api/users'] }; }\n",
  });
  try {
    const specs = new Map([['api', spec('API', { serves: '`/api/tasks`.' })]]);
    assert.deepEqual(await checkDeclaredInterfaces(root, specs), ['`/api/users` is defined in the code but no feature lists it under Serves.']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  const broken = await fixture({ 'scripts/declared-interfaces.mjs': 'export const other = 1;\n' });
  try {
    assert.deepEqual(await checkDeclaredInterfaces(broken, new Map()), ['scripts/declared-interfaces.mjs must export a declaredInterfaces(root) function.']);
  } finally {
    await rm(broken, { recursive: true, force: true });
  }
});

test('heading anchors follow GitHub: lowercase, no punctuation, dashes, numbered repeats', () => {
  const anchors = headingAnchors("# Tasks\n## See what's left\n### `npm run check` & you\n## Tasks\n```\n# Not a heading\n```\n## [Linked](x.md) title\n");
  assert.deepEqual([...anchors], ['tasks', 'see-whats-left', 'npm-run-check--you', 'tasks-1', 'linked-title']);
  assert.deepEqual(markdownLinkTargets('[a](SPEC.md#tasks) [b](#top) [c](https://x.dev/#y)'), [{ path: 'SPEC.md', anchor: 'tasks' }, { path: '', anchor: 'top' }]);
});

test('links must point at existing files and, for Markdown, existing headings', async () => {
  const root = await fixture({
    'SPEC.md': "# Product\n\n### See what's left\n",
    'docs/a.md': "# Top\n\n[ok](../SPEC.md#see-whats-left) [here](#top) [gone](../SPEC.md#renamed) [nowhere](missing.md) [self](#nope)\n",
  });
  try {
    assert.deepEqual(await checkLinks(root), [
      'docs/a.md: link to ../SPEC.md#renamed has no matching heading',
      'docs/a.md: broken link to missing.md',
      'docs/a.md: link to #nope has no matching heading',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a feature spec links the root user stories it implements', () => {
  const linked = spec('Tasks').replace('Summary.\n', 'Summary.\n\nUser stories: [Keep a task list](../../SPEC.md#keep-a-task-list).\n');
  assert.deepEqual(checkStoryLinks('x', linked), []);
  assert.match(checkStoryLinks('x', spec('Tasks')).join(), /^x links no user story/);
  const onlyGenerated = `${spec('Tasks')}<!-- dependencies:start -->\n[root](../../SPEC.md#x)\n<!-- dependencies:end -->\n`;
  assert.equal(checkStoryLinks('x', onlyGenerated).length, 1);
});

test('an edge calling several routes puts each on its own line, so GitHub does not clip the label', async () => {
  const root = await fixture({
    'MEMORY.md': '# m\n',
    'features/api/SPEC.md': spec('API', { serves: '`/api/tasks`, `/api/users`.' }),
    'features/api/MEMORY.md': '# m\n',
    'features/web/SPEC.md': spec('Web'),
    'features/web/MEMORY.md': '# m\n',
    'features/web/page.mjs': "fetch('/api/tasks'); fetch('/api/users');\n",
  });
  try {
    await writeDocs(root);
    assert.ok((await readFile(join(root, 'features/web/SPEC.md'), 'utf8')).includes('  f_web -.->|"/api/tasks<br/>/api/users"| f_api'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

