# How project memory works

Agents learn things while they work: why a design was chosen, which approach already failed, what breaks if you run things in the wrong order. This page explains where those lessons are kept so that the next agent finds them, whichever agent that is, and why the layout looks the way it does.

## Spec, memory and instructions

Three kinds of document, each with one job:

| Document | Says | Example |
| --- | --- | --- |
| `SPEC.md` | What must be true. The contract. | "A blank title is rejected with an error." |
| `MEMORY.md` | What was learned getting there. | "Quietly ignoring blank titles was tried and dropped: callers couldn't tell nothing was added." |
| `AGENTS.md` | How to work here. | "Run `npm test` and `npm run check` after every change." |

Memory is the only one of the three that's allowed to be provisional. Entries are dated, can be questioned, and either harden into a rule (and move into a spec or `AGENTS.md`) or get deleted.

## The layout

```text
MEMORY.md                  project-wide lessons + generated index of feature memories
features/
  tasks/
    SPEC.md                what tasks must do
    MEMORY.md              what we learned building tasks
    CLAUDE.md              generated: "@SPEC.md @MEMORY.md"
    tasks.mjs
```

- **Feature memory sits next to the feature's spec and code.** That's where an agent already is when the lesson matters, and it moves, gets renamed and is deleted along with the feature.
- **The root memory holds what crosses features** (the build, the environment, project-wide decisions) and ends with a generated index: each feature memory, how many entries it has, and the date of the newest. An agent reading the root memory at the start of a session can see which features have history worth reading.
- **One file per scope, not one file per fact.** Each file stays short enough to read whole (150 lines at the root, 80 per feature, enforced by `npm run check`), so there's no need for a search step to find the right fact inside it.

## How each agent finds the right memory

The layout relies on how the agents load files, as documented by their makers:

- **Claude Code** loads `CLAUDE.md` files in subfolders on demand: "Claude Code loads each one once Claude reads, writes, or edits another file in that subdirectory" ([Claude Code docs](https://code.claude.com/docs/en/memory)). Each feature's generated `CLAUDE.md` imports its `SPEC.md` and `MEMORY.md`, so touching any file in `features/tasks/` brings the tasks spec and memory into context, with no instruction needed. The root `CLAUDE.md` imports `AGENTS.md` and the root `MEMORY.md` at startup.
- **Codex** reads `AGENTS.md` files from the project root down to the folder it was started in, and "stops searching once it reaches your current directory" ([Codex docs](https://developers.openai.com/codex/guides/agents-md)). A file inside a feature folder therefore isn't loaded when Codex edits that feature from the project root. So the root `AGENTS.md` tells it, in step 1 of the workflow, to open a feature's `SPEC.md` and `MEMORY.md` before working there. The index in the root memory backs that up.
- **Any other agent** that reads `AGENTS.md` follows the same instruction.

## Why not a folder of many memory files?

Two well-known designs use many files:

- **Claude Code's private auto memory** keeps a `MEMORY.md` index plus one file per memory, in your home folder. Only the index is loaded at startup; other files are read when needed. That works well for one agent writing private notes with its own tooling.
- **Cline's Memory Bank** keeps several files in the repository (project brief, product context, system patterns, active context, progress) that the agent reads at the start of every task. Its maintainers have since [asked users whether to deprecate it](https://www.reddit.com/r/CLine/comments/1mu4lej/should_we_deprecate_memory_bank_looking_for_some/), and Kilo Code [documents moving memory-bank content into `AGENTS.md`](https://kilo.ai/docs/customize/agents-md).

For a shared repository, many small files mean more places to look, more files to keep current, and an index that has to be maintained by hand. Grouping by where the work happens (one memory per feature) gives the same "load only what's relevant" benefit with files a person can still read and review in a pull request. If a feature's memory outgrows its 80 lines, that's a sign that some of it has become rules (move them into the spec) or is out of date (delete it), not that it needs splitting.

## Private memory still has a job

Agents' own memory stores, like Claude Code's `~/.claude/projects/<project>/memory/`, aren't shared with other agents, teammates or CI. Use them only for facts about the person: how they like to work, their preferences, pointers to their own accounts and tools. `AGENTS.md` tells agents to save project lessons in the repository instead.

## Handing work between agents

Memory holds lessons. Work in progress lives in `TODOS.md`: an agent that stops partway says in the task's item where it stopped and what comes next, so another agent, Claude Code or Codex, can pick it up from the files alone.
