# PRFAQ: market-watch

*Working-backwards document. The press release describes the product as launched; the FAQs answer the questions a user and a reviewer would ask. Status as of 2026-10-09: v0.1.0 is public on GitHub and tagged `market-watch--v0.1.0`; no directory listing yet.*

**How to read the numbers.** Figures marked *measured* came from a command run against v0.1.0 on 2026-10-09. Figures marked *estimate* or *target* are not measurements. The two quotes are illustrative and attributed to roles, not to real people.

---

## Press release

### market-watch puts the stock market inside Claude Code

*A free, open-source Claude Code mod that adds a live ticker, quote pane, price alerts and a quote tool, so developers who follow the market can stay in their session and Claude stops guessing at prices.*

**2026-10-09.** market-watch is released today as an MIT-licensed Claude Code mod. It adds five things to a Claude Code session:

- a ticker in the status line;
- a `/quote` pane with an intraday sparkline;
- price alerts that toast once when a level is crossed;
- a market-context band above the prompt with VIX and the 10-year yield;
- a `quote` tool that Claude calls for current prices instead of recalling them from training data.

It installs with two commands and needs no API key or account.

**The problem.** Many developers keep a market tab open: quants, fintech engineers, and anyone with a position they care about. Checking it means leaving the editor, and that costs focus. When those developers ask Claude about a stock, they get a price from its training data, which can be months old and is presented without a date. For someone building financial software, an undated price is worse than no price.

**The solution.** market-watch brings the quotes to where the work already is. The status line shows SPY and the FAANG five by default, and `/watch` edits the list. `/quote NVDA` opens a pane. `/alert TSLA > 260` fires once on the crossing, then waits until the price retreats 0.5% before it re-arms, so a price hovering at the level doesn't spam you. When you ask Claude *"how did the FAANG stocks do this month?"*, Claude calls the `quote` tool. Every answer carries the source, the fetch time and each price's as-of time, and says when the market is closed.

> "I wanted the market where I already am, and I wanted Claude to stop quoting stale prices with a straight face. Every number the tool hands Claude is stamped with its source and time."
> — *the author (illustrative)*

**How it works.** market-watch is a mod: a plugin of function hooks that runs inside Claude Code. Each open session polls Yahoo Finance's public chart endpoint once a minute while the exchange is open and every 15 minutes while it is closed, plus once at session start and after a `/watch` edit. It uses the exchange's own session window from each response, so it needs no timezone or holiday code. It reaches nothing else. It doesn't read your files, run commands, see your prompts, or intercept other tools. `claude plugin validate` lists every event it hooks and every call it makes.

> "Before our team allowed it, I ran `claude plugin validate` and read the two lines that matter: what it hooks and what it calls. It hooks its own commands and its own tool, and it calls one URL."
> — *a platform engineer reviewing mods for a team (illustrative)*

**Getting started.**

```bash
claude plugin marketplace add rajib2k5/claude-market-watch
```

```bash
claude plugin install market-watch@claude-market-watch
```

Requires Claude Code v2.1.287+ in a terminal, or v2.1.286+ in the Desktop app. Source: https://github.com/rajib2k5/claude-market-watch

---

## External FAQ (users)

**Q: What does it cost?**
Nothing to install or run. There is no API key and no account. On Claude Code 2.1.293 and later, the `quote` tool's definition goes with every request to Claude: 584 characters as JSON (*measured*: name, description and input schema), about 150 tokens (*estimate*, at 4 characters per token). Earlier versions ignore `isDeferred: false` and keep the tool behind ToolSearch, so it costs nothing until Claude looks it up. Each call Claude makes to the tool adds a few hundred tokens of results.

**Q: How fresh are the prices?**
They are as fresh as Yahoo's chart endpoint, which may be delayed. While the market is open, the mod polls every 60 s, so the ticker is at most about a minute behind that source. Every price line in a tool result shows that price's own as-of time. After the close, prices are labelled *"market closed; last regular-session price"*.

**Q: Which symbols work?**
Anything Yahoo's chart endpoint knows: US stocks and ETFs (`AAPL`, `SPY`), indices (`^VIX`, `^GSPC`), share classes (`BRK-B`), futures (`ES=F`) and FX (`EURUSD=X`). An unknown symbol returns a clear error (`No data found, symbol may be delisted`) and doesn't break the rest of the request.

**Q: Can I change the default list?**
Yes. Use `/watch add NVDA TSLA`, `/watch remove NFLX`, `/watch set QQQ IWM` or `/watch reset`. The list is saved across sessions and holds up to 12 symbols.

**Q: Will alerts spam me?**
No. An alert fires once when the price crosses its level, then disarms. It re-arms only after the price moves back past the level by 0.5%. Alerts are checked on each poll, so a spike shorter than the poll interval (60 s) can be missed.

**Q: Can it place trades?**
No. It only reads public quote data. It has no broker integration, and it isn't investment advice.

**Q: Does it work in VS Code, `claude -p`, or cloud sessions?**
The commands and the `quote` tool work wherever mods run. Only the terminal and the Desktop app's Code tab draw the ticker, the pane and the band.

**Q: What does it know about me?**
It stores your watchlist and alerts in the plugin's own storage on your machine. Its only network traffic is `GET` requests to `query1.finance.yahoo.com` naming the symbols. The mod adds only the symbol, the range and a `User-Agent` header: no credentials, no conversation text, no other data.

**Q: How do I turn it off?**
`/market` hides the band. Disabling `market-watch` in `/plugin` stops the mod, and `claude plugin uninstall market-watch@claude-market-watch` removes it. See the README's [deployment guide](README.md#8-turn-it-off-or-remove-it).

---

## Internal FAQ (maintainer and reviewers)

**Q: Why a mod, and not an MCP server or a settings hook?**

| Option | Status line, pane, band | Tool for Claude | Rejected because |
|---|---|---|---|
| **Mod (chosen)** | Yes | Yes (`$.tool.register`) | — |
| MCP server | No | Yes | It can't draw anything, so the ticker, pane and band would be lost. It's also a separate process to run. |
| Settings hook + status-line script | Status line only | No | No pane, no alerts UI, no tool, and a script runs on every refresh. |
| Browser tab or OS widget | n/a | No | It doesn't solve the stale-price problem inside Claude. |

**Q: Why Yahoo's unofficial endpoint, and not a keyed API (Finnhub, Polygon, Alpaca)?**
Zero setup was a launch goal: two commands and nothing to sign up for. Yahoo's `/v8/finance/chart` endpoint answered keyless requests on 2026-10-09 (*measured*: HTTP 200). This is the largest risk in the product, covered below. The parser is isolated in `core.ts` (`chartUrl`, `parseChart`), so adding a keyed provider later is a contained change.

**Q: What are the risks, and what happens when each one hits?**

| Risk | Likelihood | Effect on users | How we would know | Mitigation |
|---|---|---|---|---|
| Yahoo changes or blocks the chart endpoint | Medium. It is undocumented, and the batch `/v7/finance/quote` endpoint already returns 401 (*measured*). | The ticker keeps its last values; the band shows `⚠` with the error; the tool returns `ERROR` lines | The band's error text, GitHub issues | Each fetch has an 8 s timeout and never throws. Planned: a pluggable keyed provider. |
| Rate limiting | Low at current volume: 8 requests a minute per open session while the market is open (*measured*: 6 watchlist + 2 context symbols); two open sessions double it | Some symbols show errors for a poll | Same | Requests are sequential, the watchlist is capped at 12, and polls drop to every 15 min when closed |
| The mods API changes between Claude Code releases (it is early access) | Medium | The mod fails to load, or a hook is skipped | `claude plugin validate` and `claude plugin test` in the release gate; the transcript names a failed mod | Pin the minimum version in the README; re-run the gate on new Claude Code releases |
| Yahoo data terms | Low for personal use | n/a | n/a | The README states personal, informational use and links the data caveats |
| A stale price is read as live | Low | A wrong number in a decision | n/a | Every price line carries an as-of time and a market-closed flag (validated: EGV C20.1) |
| Two sessions update the shared alert store at once | Medium for people with several sessions open | An alert could be dropped, resurrected or fire twice | n/a | Fixed in 0.1.1: the poller re-reads alerts just before writing and applies only its own changes by id (tests in `hooks/alerts-concurrency.test.ts`). `$.store` has no atomic update, so a narrow window remains. |
| Supply chain: a future version adds a malicious change | Low | It would run with the user's permissions, like any mod | Reviewers diff `claude plugin validate` output between versions | Releases are tagged; users and admins can pin a tag |

**Q: How is it tested?**
22 automated tests (*measured*, `claude plugin test .`). The pure core covers parsing, symbol validation, watchlist edits, the sparkline, market-open logic, model-text formatting and the alert state machine. Integration tests run through the engine and cover `/watch` and the `quote` tool, with the network mocked. On 2026-10-09 the published copy was installed from GitHub in an isolated config, and `claude -p "/watch"` returned the default watchlist at $0 model cost (*measured*). Not yet tested automatically: the drawn pane and band, and real network calls (those were checked by hand with a live tool call).

**Q: What does success look like?**
These are *targets* to check at 90 days; nothing has been measured yet:
- listed on claudemods.ai and in awesome-claude-code;
- no open "mod failed to load" issue older than a week;
- a keyed-provider fallback shipped before Yahoo's endpoint breaks, not after.

Usage counts are not collected, and won't be. The mod sends no telemetry of its own.

**Q: What is explicitly out of scope?**
Trading or broker access; portfolio tracking and P&L (a candidate for a separate mod); options chains; real-time streaming; non-US market-hours logic beyond what Yahoo's session window gives; and any data that needs an account.

**Q: What would make us revisit these decisions?**
- Yahoo's chart endpoint returns errors for more than a day: switch the default to a keyed provider.
- The mods API leaves early access with breaking changes: re-validate and cut a major version.
- Users ask for more than 12 symbols: measure poll time first, since requests are sequential.

**Q: What's next?**
1. A provider interface with an optional keyed source (via the plugin's `userConfig`), keeping Yahoo as the zero-setup default.
2. A test that mounts the pane and band on both surfaces (terminal and desktop).
3. Keep tagging every release (`market-watch--v<version>`, first tag `market-watch--v0.1.0`) so users can pin.
