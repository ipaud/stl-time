# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-08-30

First release. Drop an STL, see it, get three print times.

### Added

- Drag and drop or `⌘O` to open an STL; `⌘,` for settings.
- 3D preview with orbit, zoom and pan, auto-framed on load.
- Dimensions, triangle count and a fit check against the Adventurer 5M Pro's
  220 × 220 × 220 mm build volume, naming the axis that overflows.
- Real print estimates from an installed OrcaSlicer or FlashForge Flash Studio,
  using FlashForge's own Fast (0.24 mm), Standard (0.20 mm) and Quality
  (0.12 mm) presets with no overrides.
- Filament weight, length and cost, with a configurable PLA spool price.
- An approximate estimator for when no slicer is installed, calibrated against
  real slices of five shapes and clearly labelled as approximate.
- Job cancellation: loading a new STL aborts the previous slice, drops its
  temporary files, and can never show a stale result.
- macOS arm64 `.dmg` packaging.

### Known limitations

One printer, one material, one file format, and an unsigned build. See the
README's **MVP limitations** section.

[0.1.0]: https://github.com/ipaud/stl-time/releases/tag/v0.1.0
