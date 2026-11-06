# Example specification

A small task list printed in the terminal, showing what a finished agent-ready project looks like. Copy nothing from it into a real project.

This file is the acceptance contract. It says what users can see and rely on, so that anyone, person or agent, can tell a bug from a feature. Each feature's own `SPEC.md` holds the detail for that feature and links the stories it implements; this file stays at the level of what a user experiences.

## User stories

### Keep a task list

**As a person with things to do, I want to add tasks and mark them done so that I know what's left.**

- A task needs a title; a blank one is refused with a message, and nothing is added.
- Marking a task done keeps it in the list, so finished work stays visible.
- Marking a task that doesn't exist is refused with a message, and the list doesn't change.

### See what's left

**As a person with things to do, I want to print my list in the terminal so that I see what's open at a glance.**

- Open tasks print before completed ones, each with its number.
- When nothing is open, the list says so instead of printing an empty section.

## Out of scope

- Saving the list between runs. The example keeps it in memory only.

## Open questions

- None.
