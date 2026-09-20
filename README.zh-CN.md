# pi-footer-wrap

[![CI](https://github.com/erlinerd/pi-footer-wrap/actions/workflows/ci.yml/badge.svg)](https://github.com/erlinerd/pi-footer-wrap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | 中文

pi coding agent 的**自适应换行 footer**。接管 pi 默认 footer，唯一的行为差异：**放不下就换行，绝不截断**。

pi 默认 footer 把所有扩展状态挤在一行，超出终端宽度就截断加 `…`——装了多个扩展后数据会悄悄丢失。本插件完整复刻默认 footer 的全部三行内容：

```text
~/code/xxx (main) • 会话名
↑12k ↓3.4k R45k W1k CH88.8% $0.123 45.6%/200k (auto)     glm-5.3-flash • max
45.2 tok/s · mcp: 8 tools ready · lf: tracing on · …
```

- **第 1 行**：目录（`~` 缩写）、git 分支、会话名
- **第 2 行**：累计 ↑输入 ↓输出 R/W 缓存、缓存命中率、成本、上下文占用（超 70%/90% 变色）、右侧模型名 + thinking 档位
- **第 3 行起**：**所有**扩展状态，按 key 字母序，装不下自动换行；单条超宽的字内硬换行——一个字都不少

数据来源与格式逐字段对齐 pi 0.85.x 默认 footer（`sessionManager` entries、`getContextUsage`、`ctx.thinkingLevel`、`PI_EXPERIMENTAL`、kimi `(sub)` 标记等），差异只有换行策略。

## 安装

```bash
pi install github:erlinerd/pi-footer-wrap   # GitHub
pi install /path/to/pi-footer-wrap          # 本地开发
```

新开会话即生效。

## 切换

```bash
/footer-wrap   # 随时切回 pi 默认 footer；再敲一次切回来
```

## 开发

```bash
npm install
npm test        # tsx --test
npx tsc --noEmit
```

## License

MIT
