# Feature name

One short paragraph: what this feature does for the user and what it owns. Someone who reads only this paragraph should know whether the code they are looking for lives here.

User stories: `[Story title](../../SPEC.md#story-title)`, as links to the sections of the root `SPEC.md` this feature implements.

## Behavior

- What must be true, written as checkable statements. Include edge cases and error behavior.
- Say what happens, not how the code does it. The code already shows how.
- Rules other code or people rely on are behavior too: security and privacy limits (what is never stored, logged or sent), input limits, and data formats that other code reads.

## Interfaces

- **Serves:** Routes or endpoints this feature answers, each in backticks: `/api/tasks`. None.
- **Handles:** Messages, commands or events it owns, in backticks: `task-completed`. None.
- **Stores:** Storage keys, tables or files it owns, and what each holds. None.
- **Uses:** What it relies on from other features at runtime, with a link to each. None.
- **External:** Services outside the project it talks to, separated by semicolons: Stripe API (payments); Postgres. None.

## Boundaries

- What this feature owns, and what it deliberately leaves to other features.
- Where its data lives and who is allowed to change it.
- Where its tests live.

## Verification

How to check it works: the test command, plus any manual check in the running app that tests cannot cover.

<!--
Copy this file to features/<name>/SPEC.md and replace every line above.
Keep all five Interfaces lines, writing "None." when one is empty.
Keep the "User stories:" line linking at least one root SPEC.md section;
`npm run check` fails without one, or when a link has no matching heading.
Anything in backticks under Serves or Handles must belong to this feature
alone; when another feature's code mentions it, the generated diagram draws
a runtime call between them. `npm run docs:generate` appends a generated
"Dependencies" section with a diagram below; do not edit it by hand.
-->
