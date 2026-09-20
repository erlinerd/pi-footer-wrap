// pi-footer-wrap — pure footer layout/format helpers (no pi runtime imports).
// Mirrors pi 0.85.x default footer formatting (dist/modes/interactive/components/footer.js)
// so the wrapped footer shows the SAME data, minus the "truncate with …" behavior.

import { visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

/** Loose shape of the usage object pi attaches to messages/entries. */
export interface UsageLike {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: { total?: number };
}

/** Loose shape of a pi session entry we care about (pi entries carry arbitrary extra fields). */
export interface SessionEntryLike {
  [key: string]: unknown;
  message?: { role?: string; usage?: UsageLike };
  usage?: UsageLike;
}

export interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  latestCacheHitRate: number | undefined;
}

export interface BuildStatsPartsOptions {
  totals: UsageTotals;
  ctxPercent: number;
  contextWindow: number;
  autoCompact?: boolean;
  subscription?: boolean;
  experimentalBadge?: string | null;
  colorize?: (text: string, level?: "warning" | "error") => string;
}

/** Same token compaction as the pi default footer. */
export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

/** Replace $HOME with ~ like the default footer. */
export function formatCwdForFooter(cwd: string, home: string): string {
  if (!home) return cwd;
  const resolvedHome = home.endsWith("/") ? home.slice(0, -1) : home;
  if (cwd === resolvedHome) return "~";
  if (cwd.startsWith(resolvedHome + "/"))
    return "~" + cwd.slice(resolvedHome.length);
  return cwd;
}

/** Collapse newlines/tabs/multi-spaces (statuses must stay line-safe). */
export function sanitizeStatusText(text: unknown): string {
  return String(text)
    .replace(/[\r\n\t]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

/**
 * Sum usage across session entries the way the default footer does:
 * assistant messages, toolResult messages carrying usage, branch_summary and
 * compaction entries. Also tracks the latest cache-hit rate (per assistant turn).
 */
export function collectUsage(entries?: SessionEntryLike[] | null): UsageTotals {
  const t: UsageTotals = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
    latestCacheHitRate: undefined,
  };
  for (const e of entries ?? []) {
    const u: UsageLike | undefined = e?.message?.usage ?? e?.usage;
    if (!u) continue;
    t.input += u.input || 0;
    t.output += u.output || 0;
    t.cacheRead += u.cacheRead || 0;
    t.cacheWrite += u.cacheWrite || 0;
    t.cost += u.cost?.total || 0;
    // Cache-hit rate tracks the latest ASSISTANT prompt only (matches pi:
    // compaction/branch_summary usage must not overwrite it).
    if (e?.message?.role === "assistant") {
      const prompt = (u.input || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0);
      if (prompt > 0)
        t.latestCacheHitRate = ((u.cacheRead || 0) / prompt) * 100;
    }
  }
  return t;
}

/**
 * Stats parts, in the default footer's order and format.
 * `colorize` applies theme colors (level: "warning" | "error");
 * `subscription` adds the Kimi-style " (sub)" cost marker;
 * `experimentalBadge` is a pre-colored "• xp" string, or null.
 */
export function buildStatsParts({
  totals,
  ctxPercent,
  contextWindow,
  autoCompact = true,
  subscription = false,
  experimentalBadge = null,
  colorize,
}: BuildStatsPartsOptions): string[] {
  const parts: string[] = [];
  if (totals.input) parts.push(`↑${formatTokens(totals.input)}`);
  if (totals.output) parts.push(`↓${formatTokens(totals.output)}`);
  if (totals.cacheRead) parts.push(`R${formatTokens(totals.cacheRead)}`);
  if (totals.cacheWrite) parts.push(`W${formatTokens(totals.cacheWrite)}`);
  if (
    (totals.cacheRead > 0 || totals.cacheWrite > 0) &&
    totals.latestCacheHitRate !== undefined
  ) {
    parts.push(`CH${totals.latestCacheHitRate.toFixed(1)}%`);
  }
  if (totals.cost || subscription) {
    parts.push(`$${totals.cost.toFixed(3)}${subscription ? " (sub)" : ""}`);
  }
  const auto = autoCompact ? " (auto)" : "";
  const pctText = `${ctxPercent.toFixed(1)}%/${formatTokens(contextWindow)}${auto}`;
  const level: "error" | "warning" | undefined =
    ctxPercent > 90 ? "error" : ctxPercent > 70 ? "warning" : undefined;
  parts.push(colorize ? colorize(pctText, level) : pctText);
  if (experimentalBadge) parts.push(experimentalBadge);
  return parts;
}

/**
 * Stats line with right-aligned model — same layout as the default footer,
 * but instead of truncating, the model drops to its own right-aligned line,
 * and in ultra-narrow terminals both parts hard-wrap. No data is dropped.
 */
export function layoutStats(
  parts: string[],
  right: string,
  width: number,
  minPad = 2,
): string[] {
  const left = parts.join(" ");
  const lw = visibleWidth(left);
  const rw = visibleWidth(right);
  if (lw + minPad + rw <= width) {
    return [left + " ".repeat(width - lw - rw) + right];
  }
  const wrap = (s: string): string[] =>
    visibleWidth(s) <= width
      ? [s]
      : String(wrapTextWithAnsi(s, width)).split("\n");
  if (lw <= width || rw <= width) {
    const leftLines = lw <= width ? [left] : wrap(left);
    const rightLines =
      rw <= width ? [" ".repeat(Math.max(1, width - rw)) + right] : wrap(right);
    return [...leftLines, ...rightLines];
  }
  return [...wrap(left), ...wrap(right)];
}

/**
 * Pack extension statuses onto as few lines as fit, breaking BETWEEN statuses
 * first; a single status wider than the terminal is hard-wrapped. Nothing is
 * ever truncated or dropped (unlike the default footer's "…").
 * `sep` may contain ANSI escapes — packing math uses its visible width.
 */
export function wrapStatuses(
  statuses: Iterable<string> | null | undefined,
  width: number,
  sep = " · ",
): string[] {
  const lines: string[] = [];
  let cur = "";
  const sepW = visibleWidth(sep);
  for (const raw of statuses ?? []) {
    const s = String(raw);
    if (!s) continue;
    if (visibleWidth(s) > width) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      const wrapped = wrapTextWithAnsi(s, width);
      const pieces = Array.isArray(wrapped)
        ? wrapped
        : String(wrapped).split("\n");
      for (const piece of pieces) lines.push(piece);
      continue;
    }
    if (!cur) {
      cur = s;
    } else if (visibleWidth(cur) + sepW + visibleWidth(s) <= width) {
      cur += sep + s;
    } else {
      lines.push(cur);
      cur = s;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
