# Command line memory

What agents and people have learned while working on this feature that its code and [SPEC.md](SPEC.md) don't say. Read it before changing the feature.

## Decisions

## Gotchas

- **2026-11-06** · `main.mjs` prints only when run directly: it compares `import.meta.url` with the script being run. That lets tests import `exampleList` without output appearing in the test run. Keep the guard if you change the entry point.

## Dead ends
