/**
 * pi-footer-wrap — takes over the pi footer and wraps instead of truncating.
 *
 * pi's default footer joins ALL extension statuses on one line and cuts it
 * off with "…" when it doesn't fit. With many extensions installed, data is
 * silently lost. This plugin reproduces the default footer's three lines
 * (pwd/branch/session-name, token stats + model, extension statuses) but
 * wraps every line adaptively — nothing is dropped.
 *
 * /footer-wrap toggles back to pi's default footer at any time.
 */
import { wrapTextWithAnsi, visibleWidth } from "@earendil-works/pi-tui";
import {
  buildStatsParts,
  collectUsage,
  formatCwdForFooter,
  layoutStats,
  sanitizeStatusText,
  wrapStatuses,
} from "../lib/footer";

function wrapToLines(text: string, width: number): string[] {
  if (visibleWidth(text) <= width) return [text];
  const wrapped = wrapTextWithAnsi(text, width);
  return Array.isArray(wrapped) ? wrapped : String(wrapped).split("\n");
}

export default function (pi: any) {
  let enabled = true;

  function renderFooter(ctx: any, theme: any, footerData: any, width: number) {
    const colorize = (text: string, level?: string) =>
      level === "error"
        ? theme.fg("error", text)
        : level === "warning"
          ? theme.fg("warning", text)
          : text;

    // Line 1 — cwd (branch) • session name   (same format as default)
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const cwd = ctx.sessionManager?.getCwd?.() || process.cwd();
    let pwd = formatCwdForFooter(cwd, home);
    const branch = footerData?.getGitBranch?.() ?? null;
    if (branch) pwd += ` (${branch})`;
    const sessionName = ctx.sessionManager?.getSessionName?.();
    if (sessionName) pwd += ` • ${sessionName}`;

    // Line 2 — ↑in ↓out R… W… CH…% $cost ctx%/window (auto)   + model right
    const totals = collectUsage(ctx.sessionManager?.getEntries?.() ?? []);
    const cu = ctx.getContextUsage?.() ?? null;
    const subscription = ctx.model?.provider === "kimi-coding";
    const experimentalBadge =
      process.env.PI_EXPERIMENTAL === "1"
        ? `${theme.fg("dim", "•")} ${theme.bold(theme.fg("warning", "xp"))}`
        : null;
    const parts = buildStatsParts({
      totals,
      ctxPercent: cu?.percent ?? 0,
      contextWindow: cu?.contextWindow ?? ctx.model?.contextWindow ?? 0,
      autoCompact: ctx.session?.autoCompactionEnabled ?? true,
      subscription,
      experimentalBadge,
      colorize,
    });
    const model = ctx.model;
    let right = model?.id || "no-model";
    if (model?.reasoning) {
      const level = ctx.thinkingLevel || "off";
      right =
        level === "off" ? `${right} • thinking off` : `${right} • ${level}`;
    }
    if ((footerData?.getAvailableProviderCount?.() ?? 1) > 1 && model) {
      right = `(${model.provider}) ${right}`;
    }

    // Lines 3+ — every extension status, sorted by key (like default), wrapped
    let statuses: string[] = [];
    try {
      statuses = [...(footerData?.getExtensionStatuses?.() ?? [])]
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([, text]) => sanitizeStatusText(text as string))
        .filter(Boolean);
    } catch {
      // statuses are best-effort
    }

    return [
      ...wrapToLines(pwd, width),
      ...layoutStats(parts, right, width),
      ...wrapStatuses(statuses, width, theme.fg("dim", " · ")),
    ];
  }

  function enable(ctx: any) {
    try {
      ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
        let dispose = () => {};
        try {
          const unsub = footerData.onBranchChange(() => tui.requestRender());
          if (typeof unsub === "function") dispose = unsub;
        } catch {
          // branch reactivity is optional
        }
        return {
          dispose,
          invalidate() {},
          render(w: number) {
            return renderFooter(ctx, theme, footerData, w);
          },
        };
      });
    } catch {
      // non-TUI mode — ignore
    }
  }

  pi.on("session_start", async (_event: any, ctx: any) => {
    if (enabled) enable(ctx);
  });

  pi.registerCommand("footer-wrap", {
    description:
      "Toggle pi-footer-wrap (adaptive wrapping, no truncation) vs pi default footer",
    handler: async (_args: any, ctx: any) => {
      enabled = !enabled;
      if (enabled) {
        enable(ctx);
        ctx.ui.notify("footer-wrap on — full statuses, wrapped", "info");
      } else {
        try {
          ctx.ui.setFooter(undefined);
        } catch {
          // ignore
        }
        ctx.ui.notify("pi default footer restored", "info");
      }
    },
  });
}
