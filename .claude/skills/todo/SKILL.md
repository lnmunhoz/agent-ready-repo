---
name: todo
description: Use when the user invokes /todo, says "add to tasks", or asks to add or update an item in this project's TODOS.md task list.
---

# Project todo

Capture and track project tasks in the repository-root `TODOS.md`.

1. Find the repository root (the folder holding `AGENTS.md` and `TODOS.md`), even when invoked from a subfolder. Read both files.
2. Use the text after `/todo` as the task. With no text, use the most recent clearly described task in the conversation. Ask one short question only if the task is unclear.
3. Add each distinct task as a concise `- [ ]` item under `## Open`, keeping the user's requirements and any useful acceptance details. If an open item already describes the same task, update it instead of adding a duplicate.
4. Leave other tasks and the completed history alone. For a status update, keep the wording current; move finished items to `## Completed` as `- [x]`.
5. Read the edited list back, confirm the task is recorded correctly, and reply briefly with a link to `TODOS.md`.

Recording a task is not a request to do it. Implement it only when separately asked.

Example: `/todo Show the number of open tasks in the window title.`
