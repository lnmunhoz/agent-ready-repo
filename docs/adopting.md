# Adopting this in an existing project

You don't need to restructure a working project in one go. Each step below is useful on its own, and they're ordered by how fast they pay off.

## 1. Write `AGENTS.md` (an hour, immediate payoff)

Copy [AGENTS.md](../AGENTS.md) and rewrite it for your project:

- one paragraph on what the project is and how its parts run;
- **Where things are**, describing the folders as they are today, not as you'd like them to be;
- the commands to install, test and run;
- the workflow and task-tracking sections, adjusted to taste.

Add a `CLAUDE.md` containing `@AGENTS.md` so Claude Code reads the same file. This step alone changes how well agents work in the project.

## 2. Start `TODOS.md` and `CHANGELOG.md`

Copy both files and empty them. Begin the changelog from today; there's no need to rebuild history that Git already has. Copy the `todo` skill into `.claude/skills/` and `.agents/skills/`.

## 3. Write the root `SPEC.md` from what exists

List the main things users do as user stories, with the behavior they rely on as checkable statements. Write down what the product does today, including the odd parts, and mark anything you're unsure about under **Open questions**. This is the step that lets an agent tell a bug from a feature.

## 4. Move to feature folders, one feature at a time

Pick the part of the code you change most often. Move it into `features/<name>/`, write its `SPEC.md` from the [template](feature-spec-template.md), and keep the rest of the project where it is. Repeat when you next touch another area. Mixed layouts are fine during the move; `AGENTS.md` should say which areas are already in `features/`.

## 5. Add the checks

Copy `scripts/check.mjs` and `scripts/dependencies.mjs`, add the `check` and `docs:dependencies` scripts to `package.json` (or call them from your own build tool), and run `npm run docs:dependencies`. Remove any check you aren't ready for yet from `runChecks` in `scripts/check.mjs`, and add it back once the documents are in shape. Finally, run the check in CI.
