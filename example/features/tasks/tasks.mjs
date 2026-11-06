// Pure task-list operations. A list is an array of { id, title, done }.
// Functions return a new list and never change the one they are given.

export function addTask(list, title) {
  const clean = String(title ?? '').trim();
  if (!clean) throw new Error('A task needs a title.');
  const id = list.reduce((highest, task) => Math.max(highest, task.id), 0) + 1;
  return [...list, { id, title: clean, done: false }];
}

export function completeTask(list, id) {
  if (!list.some(task => task.id === id)) throw new Error(`There is no task ${id}.`);
  return list.map(task => (task.id === id ? { ...task, done: true } : task));
}

export function openTasks(list) {
  return list.filter(task => !task.done);
}

export function completedTasks(list) {
  return list.filter(task => task.done);
}
