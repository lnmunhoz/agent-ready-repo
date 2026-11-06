# Working in this repository

This repository is a template for projects that coding agents can find their way around. It holds a tiny example task-list app (`features/tasks` and `features/cli`), the documents every project keeps, and the scripts that keep those documents current. **Replace this paragraph** with what your project is, its main parts and how they run.

## Where things are

- `features/<name>/`: one folder per feature, holding its code and its `SPEC.md`. Start here. Folder and file names say what they contain, so searching for a name usually lands in the right place.
- `SPEC.md`: what the product must do, as user stories with acceptance criteria.
- `DEPENDENCIES.md`: which features import which, and who uses each one. It is generated, so never edit it by hand.
- `CHANGELOG.md`: notable changes, newest first, grouped by date.
- `TODOS.md`: the task list, split into Open and Completed.
- `docs/`: longer explanations, including `docs/feature-spec-template.md` for new features.
- `scripts/`: project tooling, including `npm run check`.
- `test/`: tests, named after the feature or script they cover.

## Workflow

1. **Orient.** Read `README.md`, the root `SPEC.md` and the `SPEC.md` of each feature you will touch. Check `git status` so you don't overwrite someone's work in progress. Before changing a feature, look at its **Used by** list to see what else depends on it.
2. **Plan.** For work across several files, write a short plan first.
3. **Test first.** Add or adjust a test for any behavior that can be checked without a person looking at it, then implement.
4. **Implement inside the feature.** Keep a feature's code in its folder. To use another feature, import from it; don't copy its code.
5. **Verify.** Run `npm test` and `npm run check`. When a change affects something tests can't see (a screen, a sound, an external service), check it in the running app if you can. Report exactly what was and wasn't verified.
6. **Update the documents in the same change:**
   - the feature's `SPEC.md` when its behavior or boundaries change;
   - the root `SPEC.md` when what users can see or rely on changes;
   - `CHANGELOG.md` for a notable feature, fix or milestone, written for the people who use the product;
   - `README.md` when installation or usage changes;
   - `npm run docs:dependencies` when imports between features change.
7. **Review before committing.** Read the diff and the staged files. Never commit secrets, build output, logs or `node_modules/`.
8. **Ask before publishing.** After a big change (a new feature, a rework across several files, a merge) is finished and verified, ask whether to commit and push, saying which files or commits would go out and to which branch. Push only after a yes.

## Adding a feature

1. Create `features/<name>/` and copy `docs/feature-spec-template.md` into it as `SPEC.md`. Fill in every section.
2. Name files after what they do (`temporary-access.mjs`, not `utils.mjs`).
3. Add tests under `test/`, then run `npm run docs:dependencies` and `npm run check`.

## Task tracking

- `TODOS.md` is the project task list. "Add to tasks", "add a todo" and `/todo <task>` all mean: add it there.
- Add new items as unchecked boxes under **Open**. When one is done, move it to **Completed** as a checked box rather than deleting it.
- Keep wording and status current, and don't add duplicates.
- When a new request arrives while other work is in progress, treat it as part of the work unless the user replaces or cancels the earlier request. Record each distinct request in `TODOS.md` right away, note which one is in progress, and before ending your turn check that nothing under **Open** was forgotten.
- The `todo` skill handles `/todo`. It exists twice, in `.claude/skills/` for Claude Code and `.agents/skills/` for Codex; edit both, and `npm run check` confirms they match.

## Writing the documents

- Write for a reader with no memory of earlier sessions: say what is true now and why, not what you just did.
- Keep each fact in one place and link to it rather than copying it, because copies drift.
- Specs describe behavior someone can check. Leave implementation detail to the code and its comments.

## Commands

- `npm test`: run the tests.
- `npm run check`: check that the documents exist, are well formed, link correctly and match the code.
- `npm run docs:dependencies`: regenerate `DEPENDENCIES.md` and each feature's Dependencies section.
- `npm start`: run the example.
