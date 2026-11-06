# Project memory

What agents and people have learned about this project that the code, the specs and Git history don't say. Every agent reads this file when it starts: Claude Code loads it through `CLAUDE.md`, and `AGENTS.md` tells Codex and the others to read it. A lesson one agent learns is then there for the next one, whichever agent that is.

The rules for this file are in [AGENTS.md](AGENTS.md#project-memory). Keep entries short, dated and true. Once an entry becomes a standing rule, move it into `AGENTS.md` or a `SPEC.md` and delete it here.

## Decisions

- **2026-11-06** · The dependency map is generated from imports, never drawn by hand. Why: hand-drawn diagrams go stale after the first refactor and nothing notices.

## Gotchas

- **2026-11-06** · TypeScript files are often imported by their compiled name (`./foo.mjs` for `foo.mts`). `scripts/dependencies.mjs` resolves these to the real file; other code-indexing tools may not, and silently miss the connection.

## Environment

- **2026-11-06** · The scripts need Node 22 or later and have no npm dependencies, so `npm test` and `npm run check` work without `npm install`.
