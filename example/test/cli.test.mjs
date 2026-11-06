import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTaskList } from '../features/cli/format.mjs';
import { exampleList } from '../features/cli/main.mjs';

test('prints open tasks, then completed ones', () => {
  assert.equal(formatTaskList(exampleList()), [
    'Open',
    '  [ ] 1. Write the SPEC.md for your first feature',
    '  [ ] 2. Replace the example features',
    '',
    'Completed',
    '  [x] 3. Read AGENTS.md',
  ].join('\n'));
});

test('says when nothing is open and leaves out an empty Completed section', () => {
  assert.equal(formatTaskList([]), 'Open\n  Nothing left to do.');
});
