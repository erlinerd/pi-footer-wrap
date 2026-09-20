import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleWidth } from "@earendil-works/pi-tui";
import {
  buildStatsParts,
  collectUsage,
  formatCwdForFooter,
  formatTokens,
  layoutStats,
  sanitizeStatusText,
  wrapStatuses,
} from "../lib/footer";

const noColor = (t: string): string => t;

test("formatTokens matches pi default compaction", () => {
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(1000), "1.0k");
  assert.equal(formatTokens(20500), "21k");
  assert.equal(formatTokens(1500000), "1.5M");
});

test("formatCwdForFooter replaces home with ~", () => {
  assert.equal(
    formatCwdForFooter("/Users/lei/code/x", "/Users/lei"),
    "~/code/x",
  );
  assert.equal(formatCwdForFooter("/Users/lei", "/Users/lei"), "~");
  assert.equal(formatCwdForFooter("/etc", "/Users/lei"), "/etc");
});

test("sanitizeStatusText collapses newlines and spaces", () => {
  assert.equal(sanitizeStatusText("a\nb\tc   d"), "a b c d");
});

test("collectUsage sums assistant/toolResult/compaction usage", () => {
  const entries = [
    { type: "message", message: { role: "user" } },
    {
      type: "message",
      message: {
        role: "assistant",
        usage: {
          input: 100,
          output: 50,
          cacheRead: 300,
          cacheWrite: 100,
          cost: { total: 0.01 },
        },
      },
    },
    {
      type: "message",
      message: {
        role: "toolResult",
        usage: { output: 20, cost: { total: 0.002 } },
      },
    },
    { type: "compaction", usage: { input: 500, cost: { total: 0.003 } } },
    { type: "custom", data: { line: "no usage here" } },
  ];
  const t = collectUsage(entries);
  assert.equal(t.input, 600);
  assert.equal(t.output, 70);
  assert.equal(t.cacheRead, 300);
  assert.equal(t.cacheWrite, 100);
  assert.ok(Math.abs(t.cost - 0.015) < 1e-9);
  // last prompt = 100+300+100 = 500 → 300/500 = 60%
  assert.ok(t.latestCacheHitRate !== undefined);
  assert.ok(Math.abs(t.latestCacheHitRate - 60) < 1e-9);
});

test("buildStatsParts orders parts like the default footer", () => {
  const parts = buildStatsParts({
    totals: collectUsage([
      {
        message: {
          role: "assistant",
          usage: {
            input: 1000,
            output: 20500,
            cacheRead: 90000,
            cacheWrite: 4000,
            cost: { total: 0.123 },
          },
        },
      },
    ]),
    ctxPercent: 45.6,
    contextWindow: 200000,
    autoCompact: true,
    colorize: noColor,
  });
  assert.deepEqual(parts, [
    "↑1.0k",
    "↓21k",
    "R90k",
    "W4.0k",
    "CH94.7%",
    "$0.123",
    "45.6%/200k (auto)",
  ]);
});

test("buildStatsParts colorizes context thresholds", () => {
  const levels: (string | undefined)[] = [];
  const colorize = (text: string, level?: string): string => {
    levels.push(level);
    return text;
  };
  buildStatsParts({
    totals: collectUsage([]),
    ctxPercent: 95,
    contextWindow: 100,
    colorize,
  });
  buildStatsParts({
    totals: collectUsage([]),
    ctxPercent: 80,
    contextWindow: 100,
    colorize,
  });
  buildStatsParts({
    totals: collectUsage([]),
    ctxPercent: 10,
    contextWindow: 100,
    colorize,
  });
  assert.deepEqual(levels, ["error", "warning", undefined]);
});

test("layoutStats pads model right-aligned on one line when it fits", () => {
  const line = layoutStats(["↑1k", "↓2k", "$0.10"], "glm-5.3-flash", 60);
  assert.equal(line.length, 1);
  assert.ok(line[0].startsWith("↑1k ↓2k $0.10"));
  assert.ok(line[0].endsWith("glm-5.3-flash"));
});

test("layoutStats moves model to its own line instead of truncating", () => {
  const long = "↑999k ↓999k R999k W999k CH99.9% $999.999 99.9%/200k (auto)";
  const lines = layoutStats(
    long.split(" "),
    "opencodex/zhipu-bigmodel-coding/glm-5.3-flash • max",
    60,
  );
  assert.equal(lines.length, 2);
  assert.equal(lines[0], long);
  assert.ok(lines[1].trimEnd().endsWith("glm-5.3-flash • max"));
});

test("wrapStatuses packs statuses onto fitting lines", () => {
  const lines = wrapStatuses(["aaa", "bbb", "ccc"], 15);
  assert.deepEqual(lines, ["aaa · bbb · ccc"]);
});

test("wrapStatuses breaks between statuses, never truncates", () => {
  const lines = wrapStatuses(["aaaa", "bbbb", "cccc"], 11);
  assert.deepEqual(lines, ["aaaa · bbbb", "cccc"]);
});

test("wrapStatuses separator packing uses visible width for ANSI separators", () => {
  const ansiSep = "\x1b[2m · \x1b[0m"; // string length 13, visible width 3
  const lines = wrapStatuses(["aaa", "bbb"], 9, ansiSep);
  assert.equal(lines.length, 1);
  assert.equal(visibleWidth(lines[0]), 9);
});

test("wrapStatuses hard-wraps an oversized status without data loss", () => {
  const s = "x".repeat(25);
  const lines = wrapStatuses([s], 10);
  const rejoined = lines.join(" ").replace(/ {2,}/g, " ").trim();
  assert.equal(rejoined.replace(/ /g, ""), s);
  for (const line of lines) assert.ok(line.length <= 10 || line.includes(" "));
});

test("wrapStatuses keeps all content across wraps", () => {
  const statuses = [
    "speed: 45.2 tok/s",
    "mcp: 8 tools ready",
    "lf: tracing on",
    "another status here",
  ];
  const lines = wrapStatuses(statuses, 30);
  const all = lines.join("\n");
  for (const s of statuses) assert.ok(all.includes(s));
});
