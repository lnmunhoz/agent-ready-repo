// Lists the routes, messages and events the code actually defines, so that
// `npm run check` can fail when one is missing from every feature's Interfaces.
//
// Each feature's SPEC.md lists what it answers under **Serves** (routes) and
// **Handles** (messages, commands, events). The generated diagrams draw runtime
// calls from those lists, so a route nobody lists simply doesn't appear. Only
// this project knows where its routes and messages are defined, so fill this in
// once there is a server, a message handler or an event bus.
//
// Return null while nothing is declared (the check is skipped), or an object
// with either or both lists:
//
//   { serves: ['/api/tasks', '/api/users'], handles: ['task-completed'] }
//
// The check then requires every entry to be listed by exactly one feature, and
// every token a feature lists under that line to be one of the entries. Return
// only the lists you can read reliably; a list you leave out isn't checked.
//
// Example for a server that declares routes as `app.get('/api/...', ...)`:
//
//   import { readFile } from 'node:fs/promises';
//   import { join } from 'node:path';
//   export async function declaredInterfaces(root) {
//     const server = await readFile(join(root, 'features/api/server.mjs'), 'utf8');
//     const serves = [...server.matchAll(/\bapp\.(?:get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
//     return { serves: [...new Set(serves)].sort() };
//   }

/** @returns {Promise<null | { serves?: string[], handles?: string[] }>} */
export async function declaredInterfaces(root) {
  return null;
}
