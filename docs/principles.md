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

**The rule:** each document answers one question (see the table in the [README](../README.md#the-files)). A fact lives in exactly one place; everywhere else links to it.

**Without it:** the setup steps appear in the README, the contributing guide and a wiki page, and after a few months they disagree. The agent reads one at random and follows the stale one.

**With it:** there is nowhere for a second, outdated copy to hide. When something changes, there is one place to update.

## 4. Specs describe behavior, code describes implementation

**The rule:** the root `SPEC.md` holds user stories with acceptance criteria: what a user can see and rely on. Each feature's `SPEC.md` holds that feature's behavior, its boundaries (what it owns, what it leaves to others) and how to verify it. Neither repeats how the code works.

**Without it:** an agent asked to "fix" something can't tell whether the current behavior is a bug or a deliberate choice, so it guesses. Specs that describe implementation go stale with every refactor.

**With it:** "is this a bug?" has an answer. Specs written as checkable statements also turn directly into tests.

## 5. Generate what can be generated, check the rest

**The rule:** anything derivable from the code is generated. Here that's `DEPENDENCIES.md` and each feature's **Dependencies** section (what it uses, and what uses it). Everything else has a shape that `npm run check` verifies, and CI runs the check.

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

## What about agent memory?

Claude Code keeps an automatic memory: a `MEMORY.md` index plus short notes, stored in your home folder (`~/.claude/projects/<project>/memory/`), not in the repository. Other agents have their own versions. It's useful, but it isn't a substitute for these documents:

- **It's private.** Only one agent, for one person, on one machine, sees it. Teammates, CI, other agents, and you on another computer don't.
- **Nothing checks it.** A memory can go stale without anything failing, and the agent will still trust it.

So the rule is: **facts about the project go in the repository; facts about you go in memory.** How to build or test the project, a convention, a design decision, a trap in the code: these belong in `AGENTS.md`, a `SPEC.md` or `docs/`. Your preferences, how you like to work, and pointers to your own accounts and tools belong in memory. When a memory turns out to be true for the project, move it into the repository and delete the memory.

That's why the template has no `MEMORY.md` of its own. Committed to the repository, it would only duplicate `AGENTS.md`.

## The task list and the changelog

These two files carry the project's memory between sessions:

- **`TODOS.md`** is what's next. Agents add to it when you ask (`/todo …`), and record new requests that arrive while they're busy so nothing is lost. Finished items move to **Completed** instead of being deleted, so you can see what was done and how it was worded.
- **`CHANGELOG.md`** is what happened, in the words of the people who use the product. Git history answers "which lines changed"; the changelog answers "what's different for me".
