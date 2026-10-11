# Claims ledger — market-watch (pre-registered, FROZEN)

- Code under test: `~/dev/claude-market-watch` working tree, checksums in `env-pin.txt`.
- Pre-registered: 2026-10-11T03:10Z, before either channel ran. No claim may be added, dropped or reworded during the audit; newly found claims go to a separate "late claims" section and get both channels.
- Every **material** claim starts **REJECTED**.
- Claim count: 27 (24 material, 3 minor).

Sources of the claims: the code itself, plus statements in `README.md` and `PRFAQ.md` that describe behaviour.

| ID | Cat | Mat | Claim (one sentence) | Falsifier |
|---|---|---|---|---|
| C01 | environmental | material | The working-tree change to `hooks/register.tsx` versus git HEAD `aee6af5` (type alias `$` → `Engine`) produces JavaScript byte-identical to HEAD when both are transpiled with the same TypeScript options. | The two transpiled outputs differ in any byte. |
| C02 | environmental | material | The mod loads and registers commands `watch`, `quote`, `alert`, `market` in Claude Code CLI 2.1.287 with no environment variable set to enable mods. | `claude -p "/watch"` in a fresh `CLAUDE_CONFIG_DIR` with the mod installed does not return a `market-watch:` reply. |
| C03 | api | material | `$.tool.register({ name: 'quote', isDeferred: false, ... })` exposes a tool the model can call as `mcp__market-watch__quote`. | The model cannot call a tool by that name in a session with the mod loaded. |
| C04 | api | material | A `command.run` hook matched on a command the plugin registered, that returns `{ text }` without calling `next`, answers that command with that text. | The reply to the command is not the hook's `text`. |
| C05 | semantic | material | Values written with `$.store.set` persist across separate Claude Code sessions (processes) for the same plugin and config dir. | A value set in one `claude -p` run is absent in the next run with the same config dir. |
| C06 | semantic | material | Values written with `$.state.set` (via `update`) do not persist into a new session process. | A `$.state` value set in one `claude -p` run is visible in the next run. |
| C07 | semantic | material | `/watch` with no stored list replies with exactly `SPY, META, AAPL, AMZN, NFLX, GOOGL` in that order. | Any other list or order. |
| C08 | semantic | material | `/watch add` appends new valid symbols, skips duplicates, reports invalid tokens as `ignored invalid`, and stores the result across sessions. | An invalid token is stored, a duplicate is appended, or the list is lost in the next session. |
| C09 | semantic | material | The stored watchlist never exceeds 12 symbols after `/watch add` or `/watch set`. | A list of 13+ symbols is stored. |
| C10 | semantic | material | `/quote SYM` for a symbol Yahoo knows replies with the symbol, its price and its day change, and opens the pane with id `market-quote`. | The reply lacks the price, or no `ui.open` with id `market-quote` occurs. |
| C11 | semantic | material | The `market-quote` pane, drawn on both the `terminal` and `desktop` surfaces after `/quote`, shows the symbol, the price and a sparkline, and validates on each surface. | Mounting the pane on either surface rejects, or the drawing lacks the symbol or price. |
| C12 | algorithmic | material | An armed alert `SYM > L` fires exactly once when a poll sees price `> L`, then reports `(fired, waiting to re-arm)`. | It fires on two consecutive polls above `L`, or never fires above `L`. |
| C13 | algorithmic | material | A fired `>` alert re-arms only when price falls below `L × (1 − 0.005)` (and a fired `<` alert only when price rises above `L × 1.005`). | It re-arms inside the 0.5% band, or does not re-arm outside it. |
| C14 | semantic | material | When an alert fires, the mod raises a toast naming the symbol, the level and the current price. | No `ui.toast` call, or its text lacks any of the three. |
| C15 | semantic | material | `/market` run twice in one session replies `Market band hidden.` then `Market band shown.` | Both replies are the same within one session. |
| C16 | semantic | material | After a successful poll, the status-line text set by the mod lists each watchlist symbol with its price and day change, in watchlist order. | The status text omits a symbol, misorders it, or lacks the price. |
| C17 | semantic | material | The above-prompt band, once `^VIX` and `^TNX` quotes exist, shows VIX and the 10-year yield, and after its Hide button is pressed it draws nothing of its own. | The band lacks VIX or 10Y, or still draws after Hide. |
| C18 | algorithmic | material | The `quote` tool's period return for range R equals `price / chartPreviousClose − 1` for that range's response, printed to 2 decimals. | A computed return differs from that formula on the same response. |
| C19 | semantic | material | The `quote` tool refuses (denies) a call whose input contains no valid symbol, and caps a call at 8 symbols. | It answers with no valid symbol, or fetches more than 8. |
| C20 | semantic | material | Every `quote` tool result line carries an as-of timestamp, and a line for a quote fetched more than 5 minutes after the session end carries `market closed`. | A line lacks the as-of time, or a post-close quote lacks the flag. |
| C21 | semantic | material | The only network destination the mod requests is `https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>`. | Any `$.http.fetch` to another host or path. |
| C22 | semantic | material | The mod's outbound requests carry no credential, no environment variable value and no conversation content: only the symbol, `range`, `interval` and a `User-Agent` header. | Any request carries other headers, a body, or data from the environment or transcript. |
| C23 | semantic | material | A chart fetch that does not answer within 8 seconds resolves to an error for that symbol without rejecting, and the other symbols in the same poll still load. | A slow fetch rejects the poll or blocks the other symbols. |
| C24 | semantic | material | While no held quote's session window contains now (plus a 5-minute grace) and every symbol has a quote, a poll less than 15 minutes after the previous poll makes no network request. | Such a poll fetches. |
| C25 | environmental | minor | Claude Code ignores `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` from v2.1.287 (README claim). | Official docs say it is still required or honoured in 2.1.287+. |
| C26 | environmental | minor | The minimum versions for mods are 2.1.287 in a terminal and 2.1.286 in the Desktop app (README claim). | Official docs state different minimums. |
| C27 | numeric | minor | The `quote` tool definition (name + description + input schema) is 586 characters (PRFAQ claim). | A measured length other than 586. |

## Late claims

*(none at pre-registration)*
