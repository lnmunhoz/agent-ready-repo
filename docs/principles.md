# Principles

Why each rule in this template exists, and what goes wrong without it. The short version is in the [README](../README.md#the-principles).

## How agents find their way

An agent starting a task has no memory of the project. It reads the instruction file (`AGENTS.md`, or `CLAUDE.md` for Claude Code), then searches: it lists folders, greps for names, and opens the files that look right. Everything in this template is about making those three steps land on the right answer on the first try:

- **The instruction file** tells it how to work and where things are.
- **The folder and file names** decide whether a search finds the right code.
- **The specs** tell it what the code is supposed to do, so it can change it without breaking the point of it.

When those are good, plain search is fast and always current. That's why this template has no code index or knowledge-graph tool: those help on very large codebases, but they can go stale or miss connections, and an agent will trust a wrong answer from them. If you add one, compare its answers with plain search before relying on it.

## 1. Organize by feature, not by layer

**The rule:** each feature gets a folder in `features/` holding all of its code and its `SPEC.md`. Shared building blocks become features of their own (like `tasks` in the example) that other features import.

**Without it:** a change to one behavior touches `controllers/`, `models/`, `services/` and `views/`. The agent has to find and read four places, and is likely to miss the fifth.

**With it:** "change how tasks are completed" means "look in `features/tasks/`". The feature's spec sits next to its code, so the agent reads the intent and the implementation together.

## 2. Name files for what they do

**The rule:** a file name says what's inside: `temporary-access.mjs`, `format.mjs`, `website-classifier.mjs`. Avoid `utils`, `helpers`, `common` and `misc`.

**Without it:** search results are a list of `index.ts` and `utils.ts` files that all have to be opened to find out which one matters.

**With it:** the file list is a table of contents. Often the agent knows where to edit before opening anything.

## 3. One question per document, one place per fact

**The rule:** each document answers one question (see the table in the [README](../README.md#the-files-a-project-gets)). A fact lives in exactly one place; everywhere else links to it.

**Without it:** the setup steps appear in the README, the contributing guide and a wiki page, and after a few months they disagree. The agent reads one at random and follows the stale one.

**With it:** there is nowhere for a second, outdated copy to hide. When something changes, there is one place to update.

## 4. Specs describe behavior, code describes implementation

**The rule:** the root `SPEC.md` holds user stories with acceptance criteria: what a user can see and rely on. Each feature's `SPEC.md` holds that feature's behavior, its boundaries (what it owns, what it leaves to others) and how to verify it. Neither repeats how the code works. Rules that other code or people rely on are behavior, not implementation: security and privacy limits (what is never stored, logged or sent), input limits, and data formats other code reads belong in the spec. Each feature spec links the root stories it implements, and `npm run check` fails when a link loses its heading, so the two levels stay connected.

**Without it:** an agent asked to "fix" something can't tell whether the current behavior is a bug or a deliberate choice, so it guesses. Specs that describe implementation go stale with every refactor.

**With it:** "is this a bug?" has an answer. Specs written as checkable statements also turn directly into tests.

## 5. Generate what can be generated, check the rest

**The rule:** anything derivable from the code is generated. Here that's `DEPENDENCIES.md` and each feature's **Dependencies** section (what it uses, and what uses it). Where generation depends on a hand-written list, a check compares the list with the code: `scripts/declared-interfaces.mjs` reads the routes and messages the code defines, and the check fails when a feature's Interfaces miss one. Everything else has a shape that `npm run check` verifies, and CI runs the check.

**Without it:** "remember to update the docs" works for a week. A hand-drawn architecture diagram is wrong after the first refactor, and nobody notices until someone relies on it.

**With it:** a stale document fails the build, and it fails close to the change that made it stale, while the person or agent still remembers why. The **Used by** list answers "what could this change break?", which is the question agents most often get wrong.

## 6. Update docs in the same change as the code

**The rule:** a change isn't finished until its spec, changelog entry and dependency map are updated. `AGENTS.md` lists which document to touch for which kind of change.

**Without it:** docs are "updated later", which in practice means never, or in a big batch where the reasons have already been forgotten.

**With it:** the diff tells the whole story, and reviewing a change includes reviewing what it claims to do.

## 7. Write for a reader with no memory

**The rule:** documents say what is true now and why. The changelog speaks to the people who use the product. Task items say enough to be picked up cold.

**Without it:** notes like "fixed the thing from yesterday" or "see the discussion" mean nothing to the next session, which starts with an empty memory.

**With it:** any session, human or agent, can pick up any task from the files alone.

## Shared memory across agents

Agents learn things while they work: that a test is slow unless a server runs first, that a design was chosen for a reason, that an import style confuses some tools. Claude Code saves lessons like these in its automatic memory, but that memory lives in your home folder (`~/.claude/projects/<project>/memory/`), not in the repository. Codex keeps its own, separately. Neither can read the other's, and teammates, CI, and you on another computer can't read either. Switch from Claude Code to Codex mid-project and every lesson stays behind.

So the project keeps its memory in the repository, at two levels: a `MEMORY.md` in each feature folder, next to that feature's spec, and a root [MEMORY.md](../template/MEMORY.md) for lessons that cross features.

- **Every agent reads it.** Claude Code loads the root memory at startup and a feature's memory as soon as it touches that feature (through the feature's generated `CLAUDE.md`). `AGENTS.md` tells every other agent to do the same.
- **It holds what nothing else does:** decisions and their reasons, traps, dead ends. Not what the code, the specs or Git already say.
- **Entries are dated,** so a stale one is easy to spot and question.
- **It's kept short.** `npm run check` fails above 150 lines at the root and 80 per feature. When an entry becomes a standing rule, it moves into `AGENTS.md` or a `SPEC.md`; when it turns out wrong, it's deleted.

[docs/memory.md](memory.md) covers the design in detail, including why it uses one file per feature rather than a folder of many memory files.

Private agent memory still has a job: **facts about you go there; facts about the project go in the repository.** How you like to work, your preferences, and pointers to your own accounts and tools stay private. `AGENTS.md` tells agents to save project lessons in `MEMORY.md` instead of their private memory.

For work in progress, the handoff lives in `TODOS.md`: an agent that stops partway says in the task's item where it stopped and what comes next, so a different agent can continue.

## The task list and the changelog

These two files carry the project's memory between sessions:

- **`TODOS.md`** is what's next. Agents add to it when you ask (`/todo …`), and record new requests that arrive while they're busy so nothing is lost. Finished items move to **Completed** instead of being deleted, so you can see what was done and how it was worded.
- **`CHANGELOG.md`** is what happened, in the words of the people who use the product. Git history answers "which lines changed"; the changelog answers "what's different for me".
