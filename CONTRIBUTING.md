# Contributing

Thanks for looking. STL Time is deliberately small, so the most useful thing you
can do is keep it that way.

## What this project is

One question, answered well: _how long will this STL take on a FlashForge
Adventurer 5M Pro?_ Drop a file, get three numbers.

It is not a slicer, and it will not become one. Support painting, object
editing, G-code preview, printer management and account systems are all out of
scope. The README's **MVP limitations** section lists what is missing on purpose
versus what is simply not built yet.

## Getting set up

```bash
pnpm install
pnpm dev
```

If `pnpm dev` dies with `Cannot read properties of undefined (reading 'setName')`,
your shell has `ELECTRON_RUN_AS_NODE=1` set — some editors do this. Use
`env -u ELECTRON_RUN_AS_NODE pnpm dev`.

Install OrcaSlicer or FlashForge's Flash Studio if you want to work on anything
touching real slicing. Without one, the app runs on the fallback estimator.

## Before you open a PR

```bash
pnpm lint
pnpm typecheck
pnpm test
```

All three must pass. Then actually run the app and use your change — the PR
template asks you to say what you ran, and to be honest about the difference
between _implemented_ and _verified_.

## House rules

**Say what you verified, not what you assume.** This codebase was built by
testing the slicer's real behaviour rather than trusting its documentation, and
several of its quirks are only knowable that way: the CLI exits `0` on failure,
`--outputdir` will not create itself, `--arrange 0` leaves an off-origin model
outside the bed. If you change how the app talks to the slicer, run a real slice
and put the numbers in the PR.

**Never invent slicer settings.** The three presets are FlashForge's own, used
unmodified so the app's times match what the user would see in Flash Studio
itself. If you think a setting should be overridden, open an issue with real
measurements first.

**The fallback estimator's constants are measurements.** They were fitted
against real slices of five deliberately different shapes, and those five cases
are pinned in `src/main/slicer/fallback.test.ts`. Changing a constant without
re-measuring will break the suite, which is the point.

**Nothing leaves the machine.** No network calls, no analytics, no telemetry. A
PR that adds any of these will be closed.

**Keep the renderer sandboxed.** `contextIsolation` on, `nodeIntegration` off,
`sandbox` on. Everything the page can reach lives in `src/preload/index.ts`, and
every path it sends is re-validated in the main process before it reaches
`spawn`. Arguments go to `spawn` as an array — never build a shell string.

**Logs are for the terminal, and stay small.** Paths, ids and timings only.
Never a model or a G-code body.

## Code style

Prettier and ESLint decide formatting and most of the rest:

```bash
pnpm format
```

Beyond that: TypeScript `strict`, no `any`, small focused files, and comments
that explain _why_ rather than restate the code. Most of the existing comments
exist because something surprising is going on — if nothing is surprising, the
code can usually speak for itself.

## Reporting a security issue

Please do not open a public issue. Email the maintainer instead, or use GitHub's
private vulnerability reporting on this repository.
