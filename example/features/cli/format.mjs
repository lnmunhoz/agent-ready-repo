// Turns a task list into the text the command line prints.

import { completedTasks, openTasks } from '../tasks/tasks.mjs';

export function formatTaskList(list) {
  const open = openTasks(list);
  const done = completedTasks(list);
  const lines = ['Open'];
  lines.push(...(open.length ? open.map(task => `  [ ] ${task.id}. ${task.title}`) : ['  Nothing left to do.']));
  if (done.length) lines.push('', 'Completed', ...done.map(task => `  [x] ${task.id}. ${task.title}`));
  return lines.join('\n');
}
