# market-watch

A [Claude Code](https://code.claude.com) mod that puts the stock market inside your coding session: a live ticker in the status line, a `/quote` pane with a sparkline, price alerts, a market-context band above the prompt, and a `quote` tool so Claude uses current prices instead of guessing from training data.

Built on **function hooks**: a hooks module (`hooks/register.tsx`) that exports `register`. It is not a shell-hook plugin, a skill, or an MCP server.

```text
status line   SPY 778.57 ▲0.60% · META 718.67 ▼0.31% · AAPL 336.64 ▼1.11% · AMZN 262.43 ▲3.29% · NFLX 70.30 ▼1.77% · GOOGL 351.66 ▲0.97%
band          Market closed · VIX 14.84 ▼3.70% · 10Y 5.24% · last trade 12m ago   [ Hide ]
```

> Not investment advice. Prices come from Yahoo Finance's unofficial chart endpoint and may be delayed. See [Data source](#data-source).

## Features

| Feature | Where it shows | How you use it |
|---|---|---|
| **Ticker** | Status line | Starts with the session. Default watchlist: **SPY, META, AAPL, AMZN, NFLX, GOOGL**. |
| **Editable watchlist** | Slash command | `/watch`, `/watch add NVDA TSLA`, `/watch remove NFLX`, `/watch set QQQ IWM`, `/watch reset`. Saved across sessions, 12 symbols max. |
| **Quote pane** | Side pane | `/quote NVDA`: price, day change, intraday sparkline, chart low/high, day range, volume, as-of time. |
| **Price alerts** | Toast | `/alert TSLA > 260`, `/alert SPY < 550`, `/alert` (list), `/alert rm a1`, `/alert clear`. |
| **Market band** | Row above the prompt | Market open/closed, VIX, 10-year yield, data age, last poll error. `/market` or the Hide button toggles it. |
| **`quote` tool** | Claude calls it | Ask *"how did the FAANG stocks do this month?"* and Claude calls `mcp__market-watch__quote` with up to 8 symbols and a range (`1d` `5d` `1mo` `3mo` `6mo` `ytd` `1y`). |

### Alert behaviour

An alert fires **once** when the price crosses its level, then disarms. It re-arms only after the price moves back past the level by 0.5%. That stops a price hovering at 260.01 / 259.99 from toasting every minute. An alert only fires for a symbol on the watchlist; `/alert` tells you when a symbol is not on it.

### Polling

- One request per symbol (the watchlist plus `^VIX` and `^TNX`), made one after another.
- Every **60 s** while the exchange's regular session is open, plus 5 minutes after the close to catch the closing print.
- Every **15 min** while the market is closed, only to learn the next session's window.
- The open/closed decision uses the session window Yahoo returns with each quote, so there is no timezone, DST or holiday calendar code to get wrong.

## Requirements

- **Claude Code 2.1.287 or later**. Tested on 2.1.287 (CLI) and 2.1.293 (desktop app).
- **Function hooks enabled.** Mods are early access. Add this to `~/.claude/settings.json` and restart Claude Code:

  ```json
  { "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
  ```

  Or set it for one session: `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude`.
- Network access to `query1.finance.yahoo.com`. No API key, no account.

## Install

At the prompt of a terminal session:

```text
/plugin install market-watch --marketplace rajib2k5/claude-market-watch
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

Or from a shell:

```bash
claude plugin marketplace add rajib2k5/claude-market-watch
```

```bash
claude plugin install market-watch@claude-market-watch
```

To try it without installing, clone the repo and load the folder for one session:

```bash
git clone https://github.com/rajib2k5/claude-market-watch.git
```

```bash
claude --plugin-dir ./claude-market-watch
```

Then run `/watch` to see the watchlist, or `/quote AAPL`.

## What it hooks, and what it can reach

Reviewers and cautious users: this is the complete surface, as reported by `claude plugin validate`.

| | |
|---|---|
| **Hooks** | `session.start` (registers commands, the tool and the poll timer) · `command.run` for `watch`, `quote`, `alert`, `market` only · `tool.call` for `mcp__market-watch__quote` only · `ui.render` for its own `Pane` (`market-quote`) and the `AbovePrompt` band |
| **Calls on `$`** | `http.fetch`, `clock.now/after/every`, `store.get/set`, `state.get/set`, `command.register`, `tool.register`, `ui.open/resolve/status/toast` |
| **Network** | `GET https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>` only. Symbols are validated against `^\^?[A-Z0-9][A-Z0-9.\-=]{0,14}$` and URL-encoded. No credentials are sent. |
| **Stored on disk** | Your watchlist and alerts, in the plugin's own `$.store`. Nothing else. |
| **Does not touch** | Your files (`$.fs`), shell (`$.process`), other tools' calls, your prompts, the system prompt, or the transcript. It hooks no other tool and cannot block anything. |

## Data source

Quotes come from Yahoo Finance's **unofficial, undocumented** chart endpoint (`/v8/finance/chart`). It needs no key, but:

- It can change or start refusing requests without notice. The batch quote endpoint (`/v7/finance/quote`) already returns `401`, which is why this mod makes one request per symbol.
- Prices may be delayed, and Yahoo's terms govern use of the data. This mod is for personal, informational use.
- Every `quote` tool result includes the source, the fetch time, each symbol's as-of time, and a "market closed" flag, so Claude does not present an old price as live.

If the endpoint fails, the band shows the error (for example `⚠ AAPL: timed out after 8s`) and the ticker keeps the last good values.

## How it works

```text
hooks/
  core.ts            pure functions: parse, format, sparkline, market-open check, alert state machine
  register.tsx       the shell: timer, http.fetch, $.store / $.state, commands, tool, pane, band
  core.test.ts       unit tests for core.ts
  register.test.ts   integration tests through the engine: commands and the tool, network mocked
types/index.d.ts     state contract: the $.state values the pane and band read
.claude-plugin/
  plugin.json        manifest
  marketplace.json   makes this repo installable as a marketplace
```

- **Pure core, imperative shell.** Everything that decides anything lives in `core.ts` with no `$`, so it is tested with plain values.
- **`$.state` for what is drawn, `$.store` for what persists.** Quotes are session state: when the poller writes them, the pane and band redraw. The watchlist and alerts persist across sessions.
- **Every fetch has an 8 s timeout and never throws**, so one bad symbol cannot stop a poll. Polls never overlap.

## Development

```bash
claude plugin validate .claude-plugin/plugin.json
```

```bash
claude plugin test .
```

Live development: `claude --plugin-dir .` loads the folder, and an interactive session reloads it on save. Claude Code writes the API types into `.claude-plugin/types/` on load (git-ignored), and `tsconfig.json` extends them, so this type-checks the mod once it has loaded at least once:

```bash
npx -p typescript@5.6.3 tsc -p .
```

`tsconfig.json` deliberately leaves out the generated `claude-code-mcp` types. Those declare every MCP tool connected in *your* session, and with a few hundred of them, typing the `tool.call` matcher exceeds TypeScript's instantiation depth (`TS2589`). The mod reads its tool's input defensively and does not need them.

## Limitations

- Yahoo's endpoint is unofficial; see [Data source](#data-source).
- Up to 12 watchlist symbols, polled one by one, which keeps you clear of Yahoo's rate limit. More symbols would make each poll slower.
- Alerts are checked only on a poll, so with a 60 s poll a brief spike between polls can be missed.
- The pane opens from `/quote` at any width. The band and status line need no width.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © 2026 Rajib Bahar

Not affiliated with or endorsed by Anthropic or Yahoo.
