# Product specification

**Replace this paragraph** with what the product is, who it's for and its main parts. The example here describes the tiny task-list app that ships with the template.

This file is the acceptance contract. It says what users can see and rely on, so that anyone, person or agent, can tell a bug from a feature. Each feature's own `SPEC.md` holds the detail for that feature (see [Tasks](features/tasks/SPEC.md) and [Command line](features/cli/SPEC.md)); this file stays at the level of what a user experiences.

## User stories

### See what's left to do

**As someone with a lot on my plate, I want to see my open tasks apart from the finished ones, so I know what's left.**

- Running `npm start` prints the open tasks first, then the completed ones, each in the order they were added.
- Each task shows its number and title, and whether it is done.
- When nothing is open, the list says so instead of printing an empty section.

### Keep the list trustworthy

**As someone relying on the list, I want it to reject mistakes instead of silently storing them.**

- A task with a blank title is refused with a clear message.
- Completing a task that doesn't exist is refused, and the list stays as it was.

## Out of scope

- Saving the list between runs.
- Editing or deleting tasks.

## Open questions

- None yet. Record decisions that still need a person here, and move each answer into the user stories once it's decided.
