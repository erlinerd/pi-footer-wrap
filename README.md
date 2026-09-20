# pi-footer-wrap

[![CI](https://github.com/erlinerd/pi-footer-wrap/actions/workflows/ci.yml/badge.svg)](https://github.com/erlinerd/pi-footer-wrap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

English | [中文](README.zh-CN.md)

**Adaptive-wrapping footer for the pi coding agent.** Takes over the default footer with exactly one behavior change: **wrap when it doesn't fit — never truncate**.

The default footer squeezes all extension statuses onto a single line and cuts them off with `…` when the terminal is too narrow — with many extensions installed, data silently disappears. This plugin re-renders the same three lines:

```text
~/code/xxx (main) • session name
↑12k ↓3.4k R45k W1k CH88.8% $0.123 45.6%/200k (auto)     glm-5.3-flash • max
45.2 tok/s · mcp: 8 tools ready · lf: tracing on · …
```

- **Line 1**: cwd (`~` abbreviated), git branch, session name
- **Line 2**: cumulative ↑input ↓output, R/W cache, cache-hit rate, cost, context usage (recolors past 70%/90%), model name + thinking level on the right
- **Line 3+**: **all** extension statuses, sorted by key; wraps onto new lines when out of width, hard-wraps single over-wide statuses — nothing is dropped

Data sources and formatting mirror the pi 0.85.x default footer field by field (`sessionManager` entries, `getContextUsage`, `ctx.thinkingLevel`, `PI_EXPERIMENTAL`, the kimi `(sub)` marker, …) — only the wrapping strategy differs.

## Install

```bash
pi install github:erlinerd/pi-footer-wrap      # GitHub
pi install npm:@erlin-ai/pi-footer-wrap     # npm
pi install /path/to/pi-footer-wrap          # local development
```

Takes effect in new sessions.

## Toggle

```bash
/footer-wrap   # switch back to pi's default footer; run again to re-enable
```

## Development

```bash
npm install
npm test        # tsx --test
npx tsc --noEmit
```

## License

MIT
