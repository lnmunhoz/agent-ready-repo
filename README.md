# Agent-ready repo

A starting point for projects that coding agents (and people) can find their way around quickly, and that stay organized as they grow.

Agents like Claude Code and Codex start every session knowing nothing about your project. They find their way the way a new teammate does: by reading what's written down and searching the code. This template makes both cheap:

- **The code is organized by feature,** so a search for what you want to change lands in one folder.
- **A few documents each answer one question:** how to work here, what the product must do, what changed, what's left.
- **A check fails when those documents fall behind the code,** so they stay worth reading.

None of this needs special tools. It's plain Markdown, a folder layout, and two small Node scripts with no dependencies.

## The files

| File | The question it answers | Updated when |
| --- | --- | --- |
| [`AGENTS.md`](AGENTS.md) | How do I work here? Where are things, what's the workflow, which commands? | The workflow or layout changes |
| [`CLAUDE.md`](CLAUDE.md) | Nothing new: it points Claude Code at `AGENTS.md`, so one file serves every agent | Rarely |
| [`MEMORY.md`](MEMORY.md) | What have agents learned that the code doesn't say? Decisions, traps, environment quirks, shared by Claude Code, Codex and any other agent | An agent learns something the next one will need |
| [`SPEC.md`](SPEC.md) | What must the product do? User stories with acceptance criteria | What users can see or rely on changes |
| `features/<name>/SPEC.md` | What does this feature own, what are its limits, how do I check it, and what depends on it? | The feature's behavior or boundaries change |
| [`DEPENDENCIES.md`](DEPENDENCIES.md) | What connects to what? Generated from the imports | Automatically, by `npm run docs:dependencies` |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed recently, and why? | A notable feature, fix or milestone lands |
| [`TODOS.md`](TODOS.md) | What's left, and what's in progress? | A task is added, started or finished |
| `README.md` | How do I install and run it? | Setup or usage changes |

`MEMORY.md` lives in the repository, not in one agent's private memory folder, so switching from Claude Code to Codex (or to a teammate) loses nothing. See [shared memory](docs/principles.md#shared-memory-across-agents).

## The principles

1. **Organize by feature, not by layer.** Everything about tasks lives in `features/tasks/`, not spread across `controllers/`, `models/` and `views/`. One search, one folder.
2. **Name files for what they do.** `temporary-access.mjs` tells a search result what's inside; `utils.mjs` doesn't.
3. **One question per document, one place per fact.** Link instead of copying, because copies drift apart.
4. **Specs describe behavior, code describes implementation.** A spec states what must be true, so an agent can tell a bug from a feature without guessing what you meant.
5. **Generate what can be generated, check the rest.** The dependency map is built from the imports. `npm run check` fails when the map, the specs, the task list or the changelog drift. Instructions get skipped; a failing check doesn't.
6. **Update docs in the same change as the code.** A spec updated "later" is a spec that's wrong today.
7. **Write for a reader with no memory.** Say what's true now and why. "I changed X" means nothing to the next session; "X does Y because Z" does.

[docs/principles.md](docs/principles.md) explains each one, with the failure it prevents.

## The working loop

Every change follows the same loop, written out in [AGENTS.md](AGENTS.md#workflow):

**Orient → plan → test → implement → verify → update the docs → review the diff.**

Orienting means reading the root spec, the specs of the features you'll touch, and the **Used by** list that tells you what else a change can break. Updating the docs is part of the change, not a follow-up.

## Start a new project

```sh
gh repo create my-app --template lnmunhoz/agent-ready-repo --private --clone
cd my-app
npm test && npm run check
```

Then make it yours:

1. Rewrite the first paragraph of `AGENTS.md` and the introduction of `SPEC.md`.
2. Delete the example features (`features/tasks`, `features/cli` and their tests) and add your own, each starting from [docs/feature-spec-template.md](docs/feature-spec-template.md).
3. Run `npm run docs:dependencies`.
4. Start `CHANGELOG.md`, `TODOS.md` and `MEMORY.md` fresh.
5. Replace this README with how to install and use your project.

Not using GitHub? Copy the files instead; nothing depends on the repository host.

## What `npm run check` enforces

- `README.md`, `AGENTS.md`, `SPEC.md`, `CHANGELOG.md`, `TODOS.md` and `DEPENDENCIES.md` exist.
- Every folder in `features/` has a `SPEC.md` with a title and non-empty **Behavior**, **Boundaries** and **Verification** sections.
- `DEPENDENCIES.md` and each feature's generated **Dependencies** section match the current imports.
- `TODOS.md` has **Open** and **Completed** sections, with no finished items under Open and no unfinished ones under Completed.
- `CHANGELOG.md` has one dated section per day (`## 2026-01-31`), newest first.
- `MEMORY.md` entries are dated (`- **2026-01-31** · …`) and the file stays under 150 lines, since every session loads it.
- Every relative link in a Markdown file points at a file that exists.
- The `todo` skill copies for Claude Code (`.claude/skills/`) and Codex (`.agents/skills/`) are identical.

The included GitHub Actions workflow runs `npm test` and `npm run check` on every push and pull request.

## Other languages

The layout and the documents work in any language. Only [scripts/dependencies.mjs](scripts/dependencies.mjs) reads code, and it understands JavaScript and TypeScript imports. It also handles TypeScript files imported by their compiled `.mjs` or `.js` names. For another language, change its `IMPORT` pattern and `resolveImport` function. The scripts need Node 22 or later, even when the project itself doesn't use Node.

## Already have a project?

You don't have to restructure everything at once. [docs/adopting.md](docs/adopting.md) suggests an order, starting with the changes that pay off fastest.

## License

[MIT](LICENSE)
