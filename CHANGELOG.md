# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-02

### Added

- Virtual models now show their routed physical model in the footer, e.g.
  `auto → group/auto-glm-5-3-flash`, mirroring pi 0.99.x default footer
  behavior. Read from session entries; same-model turns show no arrow.

### Fixed

- `layoutStats` called `String(wrapTextWithAnsi(...))`, but pi-tui returns
  `string[]`; `String()` re-joined the wrapped pieces into one line, so an
  over-wide stats line rendered unsplit and crashed pi's TUI with
  `rendered line exceeds terminal width`.

## [0.1.0] - 2026-09-20

### Added

- Takes over the pi footer and re-renders the exact default footer content:
  cwd/branch/session-name, token stats (input/output/cache/cache-hit/cost/
  context%) with right-aligned model + thinking level, and all extension
  statuses.
- Adaptive wrapping: statuses wrap across as many lines as needed (breaking
  between statuses first, hard-wrapping single over-wide statuses) — nothing
  is truncated with "…", unlike the default footer.
- `/footer-wrap` command to toggle back to pi's built-in footer at any time.
