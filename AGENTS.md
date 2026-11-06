# Working on agent-ready-repo

**Were you pointed here to set up a project?** Then don't clone or copy this repository. In the project's folder, run `npx -y github:lnmunhoz/agent-ready-repo --name "<name>" --description "<one or two sentences>"` (add `--existing` if the folder already has a project in it) and follow what it prints. [README.md](README.md#start-a-new-project) has the details.

The rest of this file is for changing agent-ready-repo itself. This repository makes new projects; it is not itself a project made from the template.

## Where things are

- `template/`: exactly the files a new project gets. `{{name}}`, `{{description}}`, `{{package}}` and `{{date}}` are filled in when a project is created, and `<!-- setup: … -->` notes mark what the project's agent must write. `template/gitignore` becomes `.gitignore`, because npm drops files named `.gitignore` from packages.
- `bin/init.mjs`: the `npx github:lnmunhoz/agent-ready-repo` command that creates a project from `template/`.
- `example/`: two small features (`tasks` and `cli`) showing a finished feature with its spec, memory and tests. They are not copied into new projects.
- `README.md` and `docs/`: the explanation of the approach, for people deciding whether to use it.
- `test/`: tests for the command, including a full run that creates a project, fills in its setup notes and runs its own tests and checks.

## Making changes

1. Change project files in `template/`, never by hand in a created project. Keep `template/.claude/skills/` and `template/.agents/skills/` identical.
2. If a change affects the example features' generated files, regenerate them: create a project in a scratch folder, copy `example/features` in, run `npm run docs:generate` there and copy the generated files back. `npm test` fails when they drift.
3. Run `npm test`. It runs this repository's tests, the template's own tests and the example's tests.
4. Update `README.md` or `docs/` when the approach changes, and add an entry to `CHANGELOG.md`.
5. Ask before pushing; `main` is what `npx github:lnmunhoz/agent-ready-repo` installs.
