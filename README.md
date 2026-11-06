# Agent-ready repo

Start projects that coding agents (and people) can find their way around quickly, and that stay organized as they grow.

## Start a new project

In the folder for the new project (empty, or with only `.git`):

```sh
npx -y github:lnmunhoz/agent-ready-repo --name "EMOM Timer" --description "A phone app that counts down EMOM workout rounds and cues each one."
```

That takes a few seconds. It copies the project files, fills in the name, date and description, generates the derived documents, runs `git init`, and prints what's left. Nothing is overwritten, committed or published.

**Agents: run that command, then follow what it prints.** What's left is only the writing that needs the user's idea: the project paragraph in `AGENTS.md`, the user stories in `SPEC.md` and how to run it in `README.md`. Each is marked with a `<!-- setup: … -->` note, and `npm run check` lists the notes until they're all filled in. Don't copy files from this repository by hand, and don't add the example features.

Pass a folder name first to create the project somewhere else (`npx -y github:lnmunhoz/agent-ready-repo my-app --name …`), or `--help` for the options.

## Why

Agents like Claude Code and Codex start every session knowing nothing about your project. They find their way the way a new teammate does: by reading what's written down and searching the code. A project made from this template makes both cheap:

- **The code is organized by feature,** so a search for what you want to change lands in one folder.
- **A few documents each answer one question:** how to work here, what the product must do, what was learned, what changed, what's left.
- **A check fails when those documents fall behind the code,** so they stay worth reading.

None of this needs special tools. It's plain Markdown, a folder layout, and two small Node scripts with no dependencies.

## The files a project gets

| File | The question it answers | Updated when |
| --- | --- | --- |
| `AGENTS.md` | How do I work here? Where are things, what's the workflow, which commands? | The workflow or layout changes |
| `CLAUDE.md` | Nothing new: it points Claude Code at `AGENTS.md` and `MEMORY.md`, so one set of files serves every agent | Rarely |
| `MEMORY.md` | What has been learned across the project that the code doesn't say? Ends with an index of the feature memories | An agent learns something project-wide the next one will need |
| `SPEC.md` | What must the product do? User stories with acceptance criteria | What users can see or rely on changes |
| `features/<name>/SPEC.md` | What must this feature do, what does it own, how do I check it, and what depends on it? | The feature's behavior or boundaries change |
| `features/<name>/MEMORY.md` | What was learned working on this feature: decisions, traps, dead ends | An agent learns something about the feature |
| `features/<name>/CLAUDE.md` | Generated: makes Claude Code load the feature's spec and memory when it works there | Automatically |
| `DEPENDENCIES.md` | What connects to what? Generated from the imports | Automatically, by `npm run docs:generate` |
| `CHANGELOG.md` | What changed recently, and why? | A notable feature, fix or milestone lands |
| `TODOS.md` | What's left, and what's in progress? | A task is added, started or finished |
| `README.md` | How do I install and run it? | Setup or usage changes |

You can read them all in [template/](template/). [example/](example/features/) shows two finished features, [tasks](example/features/tasks/SPEC.md) and [cli](example/features/cli/SPEC.md), each with its spec, memory and tests.

Memory lives in the repository, not in one agent's private memory folder, so switching from Claude Code to Codex (or to a teammate) loses nothing. The spec says what must be true; the memory next to it says what was learned getting there. [docs/memory.md](docs/memory.md) explains the design and how each agent finds the right memory.

## The principles

1. **Organize by feature, not by layer.** Everything about tasks lives in `features/tasks/`, not spread across `controllers/`, `models/` and `views/`. One search, one folder.
2. **Name files for what they do.** `temporary-access.mjs` tells a search result what's inside; `utils.mjs` doesn't.
3. **One question per document, one place per fact.** Link instead of copying, because copies drift apart.
4. **Specs describe behavior, code describes implementation.** A spec states what must be true, so an agent can tell a bug from a feature without guessing what you meant.
5. **Generate what can be generated, check the rest.** The dependency map is built from the imports. `npm run check` fails when the map, the specs, the memories, the task list or the changelog drift. Instructions get skipped; a failing check doesn't.
6. **Update docs in the same change as the code.** A spec updated "later" is a spec that's wrong today.
7. **Write for a reader with no memory.** Say what's true now and why. "I changed X" means nothing to the next session; "X does Y because Z" does.

[docs/principles.md](docs/principles.md) explains each one, with the failure it prevents.

## The working loop

Every change follows the same loop, written out in the project's [AGENTS.md](template/AGENTS.md#workflow):

**Orient → plan → test → implement → verify → update the docs → review the diff.**

Orienting means reading the root spec and memory, the spec and memory of the features you'll touch, and the **Used by** list that tells you what else a change can break. Updating the docs is part of the change, not a follow-up.

## What `npm run check` enforces

- No setup notes (`<!-- setup: … -->`) or template placeholders are left.
- `README.md`, `AGENTS.md`, `MEMORY.md`, `SPEC.md`, `CHANGELOG.md`, `TODOS.md` and `DEPENDENCIES.md` exist.
- Every folder in `features/` has a `SPEC.md` with a title and non-empty **Behavior**, **Boundaries** and **Verification** sections.
- `DEPENDENCIES.md` and each feature's generated **Dependencies** section match the current imports.
- Every feature has a `MEMORY.md` and a generated `CLAUDE.md`. Memory entries are dated (`- **2026-01-31** · …`), the root memory stays under 150 lines and each feature memory under 80, and the root memory's index of feature memories is current.
- `TODOS.md` has **Open** and **Completed** sections, with no finished items under Open and no unfinished ones under Completed.
- `CHANGELOG.md` has one dated section per day (`## 2026-01-31`), newest first.
- Every relative link in a Markdown file points at a file that exists.
- The `todo` skill copies for Claude Code (`.claude/skills/`) and Codex (`.agents/skills/`) are identical.

Each project gets a GitHub Actions workflow that runs `npm test` and `npm run check` on every push and pull request.

## Other languages

The layout and the documents work in any language. Only [generate-docs.mjs](template/scripts/generate-docs.mjs) reads code, and it understands JavaScript and TypeScript imports. It also handles TypeScript files imported by their compiled `.mjs` or `.js` names. For another language, change its `IMPORT` pattern and `resolveImport` function. The scripts need Node 22 or later, even when the project itself doesn't use Node.

## Already have a project?

You don't have to restructure everything at once. [docs/adopting.md](docs/adopting.md) suggests an order, starting with the changes that pay off fastest.

## License

[MIT](LICENSE). Projects you create from the template get no license file; choose your own.
