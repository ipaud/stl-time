# Security policy

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's
[private vulnerability reporting](https://github.com/ipaud/stl-time/security/advisories/new)
on this repository, and expect a first reply within a week.

## What is worth reporting

STL Time runs entirely on your machine and makes no network requests, so the
interesting surface is small and local:

- Anything that lets renderer content reach Node APIs, `fs`, or `child_process`.
  The renderer runs with `contextIsolation: true`, `nodeIntegration: false` and
  `sandbox: true`, and everything it can reach is in `src/preload/index.ts`.
- Anything that gets an unvalidated value into the arguments passed to `spawn`
  in `src/main/slicer/orca.ts`. Arguments are passed as an array and paths are
  re-checked in the main process, so a way around either is a real finding.
- Path traversal or arbitrary writes through the temporary job directories in
  `src/main/temp.ts`.
- Any code path that sends model data, file paths, or usage information off the
  machine. There should be none.

## Not vulnerabilities

- **The released `.dmg` is unsigned.** This is a known limitation, stated in the
  README; macOS Gatekeeper will warn on first launch.
- Issues in OrcaSlicer, Flash Studio or their presets. Please report those
  upstream.
