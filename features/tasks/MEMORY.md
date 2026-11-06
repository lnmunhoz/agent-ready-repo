# Tasks memory

What agents and people have learned while working on this feature that its code and [SPEC.md](SPEC.md) don't say. Read it before changing the feature.

## Decisions

- **2026-11-06** · Task functions take a list and return a new one instead of keeping state. Why: the feature stays free of storage and printing, so any other feature can use it and the tests need no setup.

## Gotchas

## Dead ends

- **2026-11-06** · Quietly ignoring a blank title (returning the list unchanged) was considered and dropped: a caller couldn't tell that nothing was added. `addTask` throws instead, so the mistake shows up where it happens.
