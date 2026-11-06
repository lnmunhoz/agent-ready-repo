# Changelog

Notable changes to the product, newest first. Each date gets one section, and each entry says what changed for the people who use it (and why, when that isn't obvious). Small internal changes don't need an entry; Git keeps those.

## 2026-11-06

- New projects are created with one command, `npx -y github:lnmunhoz/agent-ready-repo --name … --description …`, instead of copying this repository and cleaning it up. The project files now live in `template/`, so a new project gets no example code and no template explainer docs. The few things only the project's agent can write are marked with `<!-- setup: … -->` notes, which `npm run check` lists until they're filled in. The example features moved to `example/`.

- Project memory kept in the repository and shared by every agent, so lessons Claude Code learns are there for Codex too (and the other way round). Each feature has its own `MEMORY.md` next to its `SPEC.md` for decisions, traps and dead ends, and the root `MEMORY.md` holds project-wide lessons plus a generated index of the feature memories. A generated `CLAUDE.md` in each feature folder makes Claude Code load that feature's spec and memory automatically. `npm run check` keeps entries dated and the files short. The generator is now `npm run docs:generate`.

- First version of the template: `AGENTS.md`, the root and per-feature `SPEC.md` files, this changelog, the `TODOS.md` task list, a generated `DEPENDENCIES.md`, and `npm run check` to keep them current. Includes a small example task-list app to show how the pieces fit together.
