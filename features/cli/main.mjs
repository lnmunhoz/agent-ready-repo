// Entry point for `npm start`: builds a small example list and prints it.

import { pathToFileURL } from 'node:url';
import { addTask, completeTask } from '../tasks/tasks.mjs';
import { formatTaskList } from './format.mjs';

export function exampleList() {
  let list = [];
  list = addTask(list, 'Write the SPEC.md for your first feature');
  list = addTask(list, 'Replace the example features');
  list = addTask(list, 'Read AGENTS.md');
  return completeTask(list, 3);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(formatTaskList(exampleList()));
}
