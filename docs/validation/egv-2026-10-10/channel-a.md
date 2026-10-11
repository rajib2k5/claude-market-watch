# Channel A: documentation audit for market-watch (EGV 2026-10-10)

- Auditor: Channel A (documentation only). No code, CLI, test, probe, node or tsc was executed. Read-only inspection only: `cat`, `grep`, `sed -n`, `ls`, and one `git diff HEAD -- hooks/register.tsx` to see the C01 diff.
- Retrieval date for every source: 2026-10-11.
- Inputs read: claims-ledger.md, env-pin.txt, hooks/register.tsx, hooks/core.ts, hooks/hooks.json, types/index.d.ts, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, tsconfig.json. Channel B files, README.md and PRFAQ.md were not read.

## Sources and version pin

| Key | Source | Version it documents |
|---|---|---|
| DTS | `/private/tmp/claude-502/bundled-skills/2.1.293/ab5f87173ccd49822681ff8dee2701e3/plugin-authoring/types/claude-code.d.ts` | Claude Code **2.1.293** (line 1: "Written by Claude Code 2.1.293.") |
| REF | `/private/tmp/claude-502/bundled-skills/2.1.293/ab5f87173ccd49822681ff8dee2701e3/plugin-authoring/reference.md` | bundled with 2.1.293 |
| OVW | https://code.claude.com/docs/en/plugins/mods/overview | unversioned (current) |
| API | https://code.claude.com/docs/en/plugins/mods/api | unversioned (current) |
| MREF | https://code.claude.com/docs/en/plugins/mods/reference | "as of v2.1.290" (stated on the page) |
| UI | https://code.claude.com/docs/en/plugins/mods/interface | unversioned (current) |
| TS | https://www.typescriptlang.org/docs/handbook/2/basic-types.html ("Erased Types") | TypeScript handbook (current) |

**Version gap (applies to every DTS/REF/MREF citation):** the CLI under test is **2.1.287**. No primary source written for 2.1.287 exists. DTS/REF are 2.1.293 and MREF is 2.1.290. The web pages give per-feature minimums where a feature is newer. One of these minimums bears on this ledger directly: `isDeferred` needs 2.1.293 (see C03).

## Leads for Channel B (doc-derived risks, not verdicts)

1. **`isDeferred: false` does nothing on 2.1.287.** API states the field "requires Claude Code v2.1.293 or later, and earlier versions ignore it." On the CLI under test, the `quote` tool sits behind ToolSearch. The schema is not in the prompt from the start.
2. **`$.store` is shared and not atomic.** MREF: "A key-value store that every session on the machine shares." UI: "A `get` followed by a `set` isn't atomic." `checkAlerts` runs in every open session every 60 s. It reads alerts, maps them and writes the whole array back. `/alert add|rm|clear` and `/watch` do the same. A stale write can re-arm a fired alert, or drop a newly added one.
3. **Module variables reset on reload, `$.state` does not, and `session.start` fires again after a reload** (MREF Session table). `lastPollMs` is a module variable. `register.tsx:130` runs `void poll($)` again on reload.
4. **Yahoo response shape has no primary documentation.** `parseChart` reads `meta.regularMarketChangePercent`, `currentTradingPeriod.regular`, `chartPreviousClose` and `indicators.quote[0].close`. If a field is missing, the code degrades without an error: the day change prints as `—`, `session` becomes null (so there is no `market closed` flag), or the sparkline is empty. Channel B must check these fields on live responses.
5. **`$.command.register` throws for a taken name, and a hook that throws is skipped** (API). Four commands are registered in a row before `$.tool.register` and the poll timer (`register.tsx:109-130`). If any one name is taken in 2.1.287, everything after it in `session.start` does not run.
6. **`$.http.fetch` follows up to 5 redirects and has a 30 s cap of its own** (API, MREF Limits).

---

## Per-claim evidence

### C01: CONFIRMED
- source: TS (tier 1); plus `git diff HEAD -- hooks/register.tsx` (read-only)
- version: TypeScript handbook (current); env-pin TS 5.6.3
- quote: "Most TypeScript-specific code gets erased away, and likewise, here our type annotations were completely erased." / "Type annotations never change the runtime behavior of your program."
- retrieved: 2026-10-11
- reasoning: The diff changes only the `type $ = EngineInterface` alias, now named `Engine`, and five parameter annotations `$: $` → `$: Engine`. All of these are type-only constructs, which emit erases. The value-level token sequence is the same in both files, line for line, so the emitted JS is identical under the same options. Channel B should still diff the two transpiled outputs to show byte identity.

### C02: UNVERIFIABLE
- source: OVW (tier 1)
- version: unversioned; states 2.1.287 minimum
- quote: "Mods are on by default. In the terminal, use Claude Code v2.1.287 or later."
- retrieved: 2026-10-11
- reasoning: The docs confirm the environment part: no env var is needed on 2.1.287 (see C25/C26). They cannot show that *this* mod loads and registers all four commands on 2.1.287. No API declaration exists for 2.1.287, so the APIs used (`atom/read/update` imports, `$.command.register`, `$.tool.register`, `Pane`/`AbovePrompt`) cannot be checked against that build. Lead 5 also applies: a taken command name stops all later registrations. A real `claude -p "/watch"` run on 2.1.287 would settle it.

### C03: CONFIRMED (with a material version caveat)
- source: DTS:13015-13018 and DTS:3009-3019 (tier 1); API "Add a tool"
- version: 2.1.293 (DTS); API unversioned
- quote: DTS:13017: "The tool's short name (letters, digits, `_`, `-`; up to 64); the model calls it as `mcp__<plugin>__<name>`." API: "Claude sees it under a longer name made of `mcp__`, your plugin's name, two underscores, and the name you registered."
- retrieved: 2026-10-11
- reasoning: `plugin.json` gives the name `market-watch` and the code registers `quote`, so the tool is `mcp__market-watch__quote`. A deferred tool can still be called once ToolSearch loads it (API: "Claude sees its name but not its description until it searches for it"), so the falsifier does not trigger. **Caveat:** API says `isDeferred: false` "requires Claude Code v2.1.293 or later, and earlier versions ignore it". On 2.1.287 the tool is deferred, not in the prompt from the start.

### C04: CONFIRMED
- source: DTS:1819-1821 (tier 1); API "Add a command"
- version: 2.1.293; API unversioned
- quote: DTS:1819: "A hook's own answer without `next` runs no command: its `text` is shown as the command's output, under the names of the plugins hooking the command unless each is bundled with Claude Code".
- retrieved: 2026-10-11
- reasoning: All four `command.run` hooks return `{ text }` without calling `next`. The docs say that text is the command's output. It shows after the plugin's name, so the output reads `market-watch: …`.

### C05: CONFIRMED
- source: DTS:3317-3321 (tier 1); UI "Keep state" table
- version: 2.1.293; UI unversioned
- quote: DTS:3317: "This plugin's own key-value store, kept between sessions and hot reloads; values are JSON data."
- retrieved: 2026-10-11
- reasoning: The docs say outright that `$.store` lasts across sessions. UI adds that it lasts until the mod deletes it, or until no session uses the store for `cleanupPeriodDays`.

### C06: CONFIRMED
- source: DTS:3349-3354 (tier 1); REF:114; UI "Keep state" table
- version: 2.1.293; UI unversioned
- quote: DTS:3349/3354: "Named values held by the host for the session, each with a version … Persist through `$.store`." UI table: `$.state` lasts until "The session ends, or the user runs `/clear`, `/resume`, or `/branch`".
- retrieved: 2026-10-11
- reasoning: `$.state` is scoped to the session, and persistence is sent to `$.store`. A new process starts a new session, so the value is gone.

### C07: CONFIRMED (source + documented contract)
- source: DTS:3325 and DTS:1789 (tier 1); source core.ts:6, register.tsx:29-31,138
- version: 2.1.293
- quote: DTS:3325: "Returns the value under `key`, or `undefined` when unset." DTS:1789: "Everything after the name, as typed (`""` when nothing was)".
- retrieved: 2026-10-11
- reasoning: An unset store gives `undefined`, so `Array.isArray` is false and `DEFAULT_WATCHLIST` is used. Bare `/watch` gives `args` of `""`, `parseWatchArgs` returns `show`, and the reply is `Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL`. Note that the reply has a `Watching: ` prefix and the plugin-name prefix from C04. The list and its order are exact.

### C08: CONFIRMED (source + documented contract; race noted)
- source: DTS:3317-3337 (tier 1); source core.ts:146-168, register.tsx:134-145
- version: 2.1.293
- quote: DTS:3331: "`get` reads back `JSON.parse(JSON.stringify(value))`".
- retrieved: 2026-10-11
- reasoning: Tokens failing `SYMBOL_PATTERN` go to `rejected` and are reported as `(ignored invalid: …)`. `applyWatch('add')` filters out symbols already present. The array of strings is written with `$.store.set`, which the docs say lasts across sessions and reads back the same. Boundaries: (a) if every token is invalid, the reply is the usage text, not `ignored invalid`, and nothing is stored, so the falsifier does not trigger; (b) adds past 12 are dropped without a message; (c) two sessions editing at the same moment can lose an update (Lead 2).

### C09: CONFIRMED (source + documented contract)
- source: source core.ts:9,164-171; DTS:3331 (store round-trip)
- version: 2.1.293
- quote: DTS:3331: "`get` reads back `JSON.parse(JSON.stringify(value))`".
- retrieved: 2026-10-11
- reasoning: Both `set` and `add` end with `.slice(0, MAX_WATCHLIST)` where `MAX_WATCHLIST = 12`. The value written is that sliced array, and the store reads back the same JSON.

### C10: UNVERIFIABLE
- source: DTS:2451-2472 (`$.ui.open`) (tier 1)
- version: 2.1.293
- quote: DTS:2451: "Opens a pane, a framed region the surface places and this plugin draws by hooking `ui.render` for `{ component: "Pane" }`; says if it is drawn."
- retrieved: 2026-10-11
- reasoning: `$.ui.open({ id: 'market-quote' })` is a documented call and the source makes it. The reply's price and day change come from Yahoo's undocumented `meta.regularMarketPrice` and `meta.regularMarketChangePercent`. No primary doc covers the Yahoo response. If `regularMarketChangePercent` is missing, the reply prints `—` for the change. A live `/quote` would settle it (Lead 4).

### C11: UNVERIFIABLE
- source: MREF "Elements" table and "Render sites" (tier 1); DTS:3774-3810, DTS:12494-12510
- version: 2.1.290 / 2.1.293
- quote: MREF: Box, Text and Button are checked for both Terminal and Desktop. UI: "If a tree uses an element the app doesn't have, a prop an element doesn't take, or a child where none goes, Claude Code draws its own version of the site."
- retrieved: 2026-10-11
- reasoning: Every element and prop used (`Box flexDirection`, `Text bold/dimColor`) is in both surface tables, so the docs give no reason the tree would fail validation. Validation is still a runtime result. The sparkline is `sparkline(q.closes)`, and that is `''` when Yahoo returns no non-null closes, which no doc rules out. A `claude plugin test` mount on both surfaces would settle it.

### C12: UNVERIFIABLE (documented race flagged)
- source: MREF `$.store` row; UI "Save from more than one session" (tier 1); source core.ts:213-221, register.tsx:91-104,158-182
- version: 2.1.290 / unversioned
- quote: UI: "Every session on your machine that runs your mod shares one `$.store`. A `get` followed by a `set` isn't atomic."
- retrieved: 2026-10-11
- reasoning: In one session with no other writer, `evaluateAlert` fires on the first poll past L and stores `isArmed: false`. Later polls do not fire, and `formatAlert` adds `(fired, waiting to re-arm)`. The docs show that the store is shared and not atomic. A stale read-modify-write from `/alert add|rm` or from another session's `checkAlerts` can write `isArmed: true` back after the fire, which gives a second fire on the next poll. Channel A cannot show how often that interleaving occurs. A two-session interleaving probe would settle it.

### C13: UNVERIFIABLE (documented race flagged)
- source: same as C12; source core.ts:199,213-221
- version: as C12
- quote: UI: "When two sessions each read a value, change it, and write it back, they race, and the second write replaces the first."
- retrieved: 2026-10-11
- reasoning: The thresholds in `evaluateAlert` match the claim exactly (`price < level*(1-0.005)` for `>`, `price > level*(1+0.005)` for `<`). The documented non-atomic shared store still allows a re-arm that does not depend on price (same mechanism as C12). The pure function holds. Whether the system as a whole holds under concurrent writers cannot be decided from docs.

### C14: CONFIRMED (source + documented contract)
- source: DTS:2422-2437 (tier 1); source register.tsx:99
- version: 2.1.293
- quote: DTS:2422: "Shows `text` for a few seconds under the plugin's name". Param: "the line to show, its first 2000 characters drawn".
- retrieved: 2026-10-11
- reasoning: On `isFired`, the code calls `$.ui.toast(`🔔 ${symbol} ${op} ${level}: now ${formatPrice(price)}`)`, which names all three. The price is rounded to 0 decimals at ≥1000 and 2 decimals below that. Toasts are not drawn in `-p`, but the call is still made.

### C15: CONFIRMED (source + documented contract)
- source: DTS:14538-14539 (`atom`), DTS:3349-3354 (`$.state`) (tier 1); source register.tsx:14,185-189
- version: 2.1.293
- quote: DTS:14538: "A named value with its initial: `read` answers the initial while nothing is written, so never `undefined`."
- retrieved: 2026-10-11
- reasoning: The initial value is `false`. The first `/market` writes `true` and replies `Market band hidden.`. The second reads `true`, writes `false` and replies `Market band shown.` Boundaries: the UI table says `/clear`, `/resume` and `/branch` reset `$.state`, and the band's Hide button writes `true`. Either one between the two commands changes the sequence.

### C16: UNVERIFIABLE
- source: DTS:2439-2449 (`$.ui.status`) (tier 1); source core.ts:115-122, register.tsx:84
- version: 2.1.293
- quote: DTS:2439: "Pins `text` as this plugin's status line under the prompt, beside the engine's own pinned notices, until the next call replaces it."
- retrieved: 2026-10-11
- reasoning: The order and the per-symbol price follow from the source after a poll where every fetch succeeds. The day change comes from Yahoo's undocumented `regularMarketChangePercent`. If that field is missing, every symbol shows `—` (Lead 4). A live poll would settle it.

### C17: CONFIRMED (source + documented contract)
- source: UI "Pick where to draw / Band above the prompt"; REF:114; MREF Elements (tier 1)
- version: unversioned / 2.1.293 / 2.1.290
- quote: UI: "Your hook returns a tree to show something in the band, or `next(e)` to show nothing." REF:114: "That read subscribes the instance, and a later `$.state.set` draws exactly the readers again".
- retrieved: 2026-10-11
- reasoning: With `^VIX`/`^TNX` in state, the tree contains ` · VIX x.xx` and ` · 10Y x.xx%`, using only `Box`, `Text dimColor` and `Button key/label/onPress`, which are valid on terminal and desktop (MREF). Hide calls `update(isBandHidden → true)` from `onPress`, where writing is allowed. The read in the render subscribes, so the band redraws, the hook returns `next(e)`, and nothing of its own is drawn. Channel A did not run the drawing.

### C18: CONFIRMED (source + documented contract)
- source: API "Add a tool" (tier 1); source core.ts:80,244-249, register.tsx:193,201
- version: unversioned
- quote: API: "The tool's arguments are fields of e, so the id is e.id".
- retrieved: 2026-10-11
- reasoning: `range` is read from `e.range`, as the docs describe. The fetch uses that range, `rangeBaseClose = meta.chartPreviousClose` from the same response, and the line prints `((price / rangeBaseClose - 1) * 100).toFixed(2)%`. That matches the formula as a percentage to 2 decimals. Boundary: for `range = '1d'` no period return is printed at all.

### C19: CONFIRMED (source + documented contract)
- source: DTS:12576-12579 and DTS:12633 (tier 1); API "Add a tool"
- version: 2.1.293
- quote: DTS:12579: "the tool's arguments spread beside them (`e.command` for Bash)." DTS:12633: "Refuses the call: the model receives the text as an error result."
- retrieved: 2026-10-11
- reasoning: `e.symbols` is read as documented, normalised, de-duplicated, filtered and `.slice(0, 8)`. If no symbol is left, the hook returns `{ deny }`. At most 8 `fetchChart` calls are made. The schema's `maxItems: 8` also limits the input.

### C20: REFUTED
- source: source register.tsx:201-202, core.ts:253-259 (the falsifier is decided by the mod's own code)
- version: working tree (sha256 e0a3a4b1… / 21feceb0…)
- quote (source, register.tsx:201): `` p.isOk ? formatForModel(p.quote, range, p.rangeBaseClose, fetchedAtMs) : `ERROR ${p.error}` ``
- retrieved: 2026-10-11
- reasoning: A symbol that fails (timeout, unknown symbol, HTTP error) gives a result line `ERROR <sym>: …` with no as-of timestamp. The falsifier "A line lacks the as-of time" therefore holds. The header line has `Fetched <ts>`, not an as-of time. The claim is true only for successful quote lines. On those, the `market closed` flag also needs Yahoo's `currentTradingPeriod.regular`. A missing or rolled-over window gives no flag (undocumented, Lead 4).

### C21: CONFIRMED (source + documented contract)
- source: DTS:14582-14600 (globals) and DTS:3443 (tier 1); API "Reach files, processes, and the network"
- version: 2.1.293; API unversioned
- quote: DTS:14582: "The globals of a hooks module's environment: these and no others (no DOM, no Node)." API: "The hooks module itself has no Node.js APIs, no timer globals such as `setTimeout`, and no network or file access of its own."
- retrieved: 2026-10-11
- reasoning: The globals list has no `fetch`, XHR or WebSocket, so network access goes only through `$`. The only network-capable `$` call in the mod is `$.http.fetch(chartUrl(symbol, range))` (register.tsx:46-47). `chartUrl` always builds `https://query1.finance.yahoo.com/v8/finance/chart/<encodeURIComponent(symbol)>?range=…&interval=…`. Boundary: the host follows up to 5 redirects (API), so a Yahoo redirect would reach a destination the mod did not request itself.

### C22: UNVERIFIABLE
- source: DTS:5180-5200 (`HttpInit.auth`) (tier 1); API `$.http.fetch` rules
- version: 2.1.293; API unversioned
- quote: DTS:5194: "The handle `$.session.authorize()` answered: the engine sets the session's credential header itself, only for a first-party host."
- retrieved: 2026-10-11
- reasoning: The mod passes only `{ headers: { 'User-Agent': 'Mozilla/5.0' } }`, with no `auth`, `body` or `method`. The docs say a credential is attached only through `auth`. Nothing in the docs states which other headers (Accept, Accept-Encoding, a host User-Agent) the host adds to the request. So "only … a User-Agent header" cannot be decided from docs. A request capture would settle it.

### C23: UNVERIFIABLE
- source: DTS:3421-3424 (`clock.after`) (tier 1); MREF Limits ("One `$.http.fetch` call, redirects and body included | 30 seconds")
- version: 2.1.293 / 2.1.290
- quote: DTS:3421-3424: "Calls `fn` once after `ms` milliseconds; `cancel()` before then stops it. One `clock.after` dispatch: `fn` runs when it resolves, and never when a hook refuses it."
- retrieved: 2026-10-11
- reasoning: The mechanism matches the docs. `fetchChart` races a `.catch`-guarded request against an 8 s `clock.after` resolve, so it never rejects. The poll loop runs one symbol after another and goes on, and the tool path uses `Promise.all` over promises that never reject. The 8 s bound is a runtime timing property that Channel A cannot observe. The docs also name a regime where it fails: a higher-tier hook that refuses `clock.after`, in which case only the host's 30 s fetch cap applies. A slow-endpoint probe would settle it.

### C24: REFUTED
- source: MREF Session table (tier 1); UI "Keep state" table; source register.tsx:57-68,130,142
- version: 2.1.290 / unversioned
- quote: MREF: `session.start` fires "Once for each loaded mod, before the first prompt, and again after a reload of that mod." UI table: a module-level variable lasts until "The module reloads".
- retrieved: 2026-10-11
- reasoning: Two counterexamples fall inside the claim's precondition (market closed, every symbol held). (1) `/watch remove|set|reset` calls `poll($, true)`. `isForced` skips the gate, so this poll fetches less than 15 min after the last one (register.tsx:68,142; deterministic). (2) After a reload, `lastPollMs` is reset to 0 but `quotes` in `$.state` survives. `session.start` runs `void poll($)` again, and that poll fetches. The claim holds only for unforced timer polls inside one module instance.

### C25: CONFIRMED
- source: OVW, "Turn mods on or off" note (tier 1)
- version: unversioned; states 2.1.287
- quote: "If you set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` during early access, remove it. Claude Code v2.1.287 and later ignores it, so setting it to `0` doesn't keep mods off."
- retrieved: 2026-10-11
- reasoning: This is a direct statement of the claim.

### C26: CONFIRMED
- source: OVW, "Turn mods on or off" (tier 1)
- version: unversioned
- quote: "In the terminal, use Claude Code v2.1.287 or later. The Desktop app includes its own copy of Claude Code, and mods work there from v2.1.286."
- retrieved: 2026-10-11
- reasoning: The minimums stated are the claimed 2.1.287 (terminal) and 2.1.286 (Desktop).

### C27: UNVERIFIABLE
- source: none applicable
- version: n/a
- quote: n/a
- retrieved: 2026-10-11
- reasoning: This is a measured character count. No doc can state it, and Channel A may not execute code to measure it. The claim also leaves the serialisation of "input schema" (JSON spacing, key order) undefined. MREF/REF give only the limit: a tool description reaches the model up to 2,048 characters. Channel B should measure it with the serialisation stated.

---

## Summary

| ID | Verdict | Source |
|---|---|---|
| C01 | CONFIRMED | TS handbook "Erased Types" + git diff |
| C02 | UNVERIFIABLE | OVW (env part only); no 2.1.287 API decl |
| C03 | CONFIRMED (isDeferred ignored < 2.1.293) | DTS:13017, DTS:3009; API |
| C04 | CONFIRMED | DTS:1819; API |
| C05 | CONFIRMED | DTS:3317; UI |
| C06 | CONFIRMED | DTS:3349-3354; REF:114; UI |
| C07 | CONFIRMED | DTS:3325, DTS:1789 + source |
| C08 | CONFIRMED | DTS:3331 + source |
| C09 | CONFIRMED | DTS:3331 + source |
| C10 | UNVERIFIABLE | DTS:2451 (Yahoo fields undocumented) |
| C11 | UNVERIFIABLE | MREF Elements; UI validation note |
| C12 | UNVERIFIABLE | UI "Save from more than one session"; MREF |
| C13 | UNVERIFIABLE | UI "Save from more than one session" |
| C14 | CONFIRMED | DTS:2422 + source |
| C15 | CONFIRMED | DTS:14538, DTS:3349 + source |
| C16 | UNVERIFIABLE | DTS:2439 (Yahoo change field undocumented) |
| C17 | CONFIRMED | UI band; REF:114; MREF Elements |
| C18 | CONFIRMED | API "Add a tool" + source |
| C19 | CONFIRMED | DTS:12579, DTS:12633 |
| C20 | REFUTED | source register.tsx:201 (ERROR lines) |
| C21 | CONFIRMED | DTS:14582, DTS:3443; API |
| C22 | UNVERIFIABLE | DTS:5194; API (host headers undocumented) |
| C23 | UNVERIFIABLE | DTS:3421-3424; MREF Limits |
| C24 | REFUTED | MREF Session; UI Keep state + source |
| C25 | CONFIRMED | OVW note |
| C26 | CONFIRMED | OVW "Turn mods on or off" |
| C27 | UNVERIFIABLE | none (measurement) |

Totals: CONFIRMED 16, REFUTED 2, UNVERIFIABLE 9.
