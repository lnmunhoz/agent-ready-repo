import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTask, completeTask, completedTasks, openTasks } from '../features/tasks/tasks.mjs';

test('addTask trims the title and uses the next free id', () => {
  const list = addTask(addTask([], 'First'), '  Second  ');
  assert.deepEqual(list, [
    { id: 1, title: 'First', done: false },
    { id: 2, title: 'Second', done: false },
  ]);
});

test('addTask rejects a blank title', () => {
  assert.throws(() => addTask([], '   '), /needs a title/);
});

test('completeTask marks one task done without changing the original list', () => {
  const list = addTask(addTask([], 'First'), 'Second');
  const next = completeTask(list, 2);
  assert.equal(list[1].done, false);
  assert.deepEqual(openTasks(next).map(task => task.id), [1]);
  assert.deepEqual(completedTasks(next).map(task => task.id), [2]);
});

test('completeTask rejects an unknown id', () => {
  assert.throws(() => completeTask(addTask([], 'First'), 9), /no task 9/);
});
