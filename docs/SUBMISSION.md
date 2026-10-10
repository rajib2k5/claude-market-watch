# Submission kit

Copy-paste text for mod directories. Keep it in sync with the README when features change.

## claudemods.ai — https://claudemods.ai/submit

| Field | Value |
|---|---|
| Mod name | market-watch |
| Category | Dashboards & HUDs |
| One-liner (≤120 chars, this one is 113) | Live stock ticker in the status line, /quote pane with sparkline, price alerts, and a quote tool Claude can call. |
| Repository URL | https://github.com/rajib2k5/claude-market-watch |
| Homepage | https://github.com/rajib2k5/claude-market-watch |
| Install command(s) | leave empty (derived from the GitHub repo), or: `claude plugin marketplace add rajib2k5/claude-market-watch` then `claude plugin install market-watch@claude-market-watch` |
| Tags (≤8) | stocks, finance, market-data, status-line, ticker, alerts, pane, tool |
| License | MIT |
| Your name or handle | Rajib Bahar (rajib2k5) |
| Your link | https://github.com/rajib2k5 |

**Description (markdown):**

```markdown
Puts the stock market inside your Claude Code session.

- **Ticker** in the status line, default SPY + META, AAPL, AMZN, NFLX, GOOGL. Edit it with `/watch add|remove|set|reset`.
- **`/quote SYM`** opens a pane with price, day change, an intraday sparkline, day range and volume.
- **`/alert TSLA > 260`** price alerts: fire once on the crossing, re-arm after a 0.5% retreat.
- **Market band** above the prompt: open/closed, VIX, 10-year yield, data age.
- **`quote` tool** Claude can call, so it uses current prices instead of training data. Every result carries the source and an as-of time.

**What it hooks:** `session.start`; `command.run` for its own four commands; `tool.call` for its own `mcp__market-watch__quote` only; `ui.render` for its own pane and the above-prompt band.

**What it can reach:** `GET https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>` (validated, URL-encoded symbol; no credentials) and its own `$.store` (watchlist, alerts). No files, no shell, no other tools, no prompts.

Needs Claude Code 2.1.287+ in a terminal or 2.1.286+ in the Desktop app; no environment variable. Data: Yahoo Finance's unofficial chart endpoint, may be delayed. Not investment advice.
```

**Anything for the reviewer?**

```text
Built on function hooks: hooks/hooks.json names one module, hooks/register.tsx, which exports register. It is not a shell-hook plugin, skill or MCP server (the "mcp__" tool name is how $.tool.register lists plugin tools). `claude plugin validate .claude-plugin/plugin.json` passes and `claude plugin test .` runs 22 tests. I am the author and have the right to list it.
```

## awesome-claude-code — https://github.com/hesreallyhim/awesome-claude-code

Open the repo's "Recommend a new resource" issue template (the maintainers do not accept PRs for recommendations). Read the live template first; fields change.

- **Name:** market-watch
- **Category:** Plugins (or Hooks, if the template separates them)
- **URL:** https://github.com/rajib2k5/claude-market-watch
- **Author:** Rajib Bahar — https://github.com/rajib2k5
- **Description:** Live stock ticker in the status line, /quote pane with sparkline, price alerts, and a quote tool Claude can call.

## Anthropic plugin directory

Submit from the in-app form (claude.ai → Settings → Plugins → Submit, or the Console's plugin submission page). Mods built on function hooks are early access, so check the form accepts them before submitting. Run `claude plugin validate` first.
