# Channel B — runtime audit (EGV 2026-10-10, market-watch)

- Auditor: Channel B (empirical only; did not read docs/, README, PRFAQ, CHANGELOG, or any channel-a file).
- Code under test: copy of the working tree at `$W/mod` (HEAD aee6af5 + modified `hooks/register.tsx`). `$W=/private/tmp/claude-502/-Users-rajibbahar-dev/fa7fa0ba-ebc6-40e5-b36e-84135a7d83b0/scratchpad/egv-b`.
- Toolchain: claude CLI 2.1.287 (`claude --version` under `env -i`), node v25.5.0, TypeScript 5.6.3 (local install in `$W/ts563`), Haiku `claude-haiku-4-5-20251001` for C03 (2 calls).
- Probe files: `$W/mod/probes/` (`world.ts` fake world; `cNN.test.ts(x)` per claim; `live-probes.sh`). Harness runner: `$W/run.sh`. Mutation runner: `$W/mutate.py`. It applies ONE replacement to `$W/mod/hooks/*`, runs the probe, restores from `$W/pristine/`, and prints the restore sha256. All restores printed `e0a3a4b1…cfe5cc` (register.tsx) / `21feceb0…bfd5cca` (core.ts), the env-pin values. Live falsifiers use separate mutant source dirs `$W/modmut-cNN` (see the C05 note for why).
- I moved the repo's own `hooks/*.test.ts` out of the probe copy to `$W/aside/` and did not use them as evidence.
- Every harness probe exits non-zero when an assertion fails (`claude plugin test` rc=1). The output blocks show the probe's `console.log` lines, the per-test pass/fail lines, and `rc`.

## Summary

| ID | verdict | probe | falsifier failed? |
|---|---|---|---|
| C01 | CONFIRMED | c01/transpile.cjs | y |
| C02 | CONFIRMED | live-probes.sh C02 | y |
| C03 | CONFIRMED | claude -p --plugin-dir (haiku) | y |
| C04 | CONFIRMED | live-probes.sh C04 + c04.test.ts | y |
| C05 | CONFIRMED | live-probes.sh C05 | y |
| C06 | CONFIRMED | live-probes.sh C06 | y |
| C07 | CONFIRMED | probes/c07.test.ts | y |
| C08 | CONFIRMED | probes/c08.test.ts | y |
| C09 | CONFIRMED | probes/c09.test.ts | y |
| C10 | CONFIRMED | probes/c10.test.ts | y |
| C11 | CONFIRMED | probes/c11.test.tsx | y |
| C12 | CONFIRMED | probes/c12.test.ts | y |
| C13 | CONFIRMED | probes/c13.test.ts | y |
| C14 | CONFIRMED | probes/c14.test.ts | y |
| C15 | CONFIRMED | probes/c15.test.ts | y |
| C16 | CONFIRMED | probes/c16.test.ts | y |
| C17 | CONFIRMED | probes/c17.test.tsx | y |
| C18 | CONFIRMED | probes/c18.test.ts | y |
| C19 | CONFIRMED | probes/c19.test.ts | y |
| C20 | CONFIRMED (scoped to quote lines; see boundary) | probes/c20.test.ts | y |
| C21 | CONFIRMED | probes/c21.test.ts | y |
| C22 | CONFIRMED | c21.test.ts | y |
| C23 | CONFIRMED | probes/c23.test.ts | y |
| C24 | CONFIRMED | probes/c24.test.ts | y |
| C25 | UNVERIFIABLE (by runtime) | (C02 only) | n/a |
| C26 | UNVERIFIABLE (by runtime) | (C02 only) | n/a |
| C27 | REFUTED (minor; method-dependent) | probes/c27.test.ts | n/a |

Counts: CONFIRMED 24 (C20 scoped to quote lines; see its boundary note) / REFUTED 1 (C27, minor) / UNVERIFIABLE 2 (C25, C26) / PROBE_INVALID 0 final. Superseded attempts, not counted: C17 first version, and the first live falsifiers for C02/C04/C05/C06 (directory-marketplace trap).

## Per-claim probe records

### C01 — CONFIRMED

- probe: `node $W/c01/transpile.cjs head.tsx wt.tsx` — TypeScript 5.6.3 `ts.transpileModule` (installed to `$W/ts563`), compiler options taken from `.claude-plugin/types/tsconfig.json` (noEmit/typeRoots/types removed); `head.tsx` = `git show HEAD:hooks/register.tsx`, `wt.tsx` = copy of working tree (sha256 e0a3a4b1…cfe5cc / matches env-pin). Exit 0 iff byte-identical. Cross-checked with a second, different option set (commonjs, react-jsx).
- output (verbatim):

```
$ TSCONFIG=mod/.claude-plugin/types/tsconfig.json node c01/transpile.cjs head.tsx wt.tsx   # project options
head.tsx 949da91b9ea75c6d1071fd12754c36137043e819cba91616fbfd13fafe93f8c5 len=12570
wt.tsx 949da91b9ea75c6d1071fd12754c36137043e819cba91616fbfd13fafe93f8c5 len=12570
ts 5.6.3 identical= true
rc=0
$ TSCONFIG=c01/alt.json node c01/transpile.cjs head.tsx wt.tsx   # alternate options (commonjs, react-jsx)
head.tsx 55e7516723ddd555844cc6730360b9901ef301b5b48511752f64ff96eec5f63d len=13032
wt.tsx 55e7516723ddd555844cc6730360b9901ef301b5b48511752f64ff96eec5f63d len=13032
ts 5.6.3 identical= true
rc=0
# falsifier 1: wtmut.tsx = wt.tsx with FETCH_TIMEOUT_MS 8_000 -> 8_001
head.tsx 949da91b9ea75c6d1071fd12754c36137043e819cba91616fbfd13fafe93f8c5 len=12570
wtmut.tsx 6ef2357452f2e4f4d86aa76ef902f6dc907012e0246235e615a38f3f7b558918 len=12570
ts 5.6.3 identical= false
falsifier_rc=1
# falsifier 2: wtmut2.tsx = wt.tsx with param $ renamed to eng in loadAlerts
head.tsx 949da91b9ea75c6d1071fd12754c36137043e819cba91616fbfd13fafe93f8c5 len=12570
wtmut2.tsx ed7bb171e6785aa9484144c6b28c44c4759319237310bdd80b3636097c5715f1 len=12572
ts 5.6.3 identical= false
falsifier2_rc=1
# wt.tsx is a copy of the repo working tree:
e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  wt.tsx
```
- falsifier: two single-change mutants of wt.tsx (a runtime constant 8_000→8_001; a value-position rename `$`→`eng`) compared to HEAD output
- falsifier output (verbatim, trimmed):

```
see falsifier 1/2 in the output above: falsifier_rc=1, falsifier2_rc=1
```
- notes: Measured: identical sha256 949da91b… (12570 bytes) under project options; 55e75167… (13032 bytes) under alternate options. Claimed: byte-identical. Agree.

### C02 — CONFIRMED

- probe: `$W/mod/probes/live-probes.sh <claim> <source dir>`: `env -i PATH=… HOME=$HOME TERM=dumb CLAUDE_CONFIG_DIR=<fresh dir under $W> claude …` (2.1.287); installs via `claude plugin marketplace add <dir>` + `claude plugin install market-watch@claude-market-watch`, then `claude -p "/cmd" </dev/null`. Exit 0 iff `/watch`, `/alert`, `/market`, `/quote AAPL` each reply with a line starting `market-watch:`. `env -i` guarantees no `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` (script exits 2 if it is present).
- output (verbatim):

```
$ probes/live-probes.sh C02 $W/mod
  claude -p "/watch" -> market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL
  claude -p "/alert" -> market-watch: No alerts.
  claude -p "/market" -> market-watch: Market band hidden.
  claude -p "/quote AAPL" -> market-watch: AAPL 336.64 ▼1.11%
rc=0
$ probes/live-probes.sh C02 $W/modmut-c02   # falsifier
  claude -p "/watch" -> market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL
  claude -p "/alert" -> market-watch: No alerts.
  claude -p "/market" -> Not logged in · Please run /login
  claude -p "/quote AAPL" -> market-watch: AAPL 336.64 ▼1.11%
falsifier_rc=1
```
- falsifier: source copy `$W/modmut-c02` with the `$.command.register({ name: 'market', … })` line deleted (mutant sha256 5aa97e16…)
- falsifier output (verbatim, trimmed):

```
(included in the log above)
```
- notes: Negative control (unregistered `/nosuchcmd` in the same fresh config) replied `Not logged in · Please run /login`, rc=1, so a `market-watch:` reply is not produced for arbitrary commands. Run from a clean env, the CLI reports `2.1.287 (Claude Code)`.

### C03 — CONFIRMED

- probe: model call 1 of 2: `env -i … claude -p "Use the mcp__market-watch__quote tool to get AAPL. Reply with only the exact tool name you called and the price it returned." --plugin-dir $W/mod --model haiku --allowedTools mcp__market-watch__quote --output-format stream-json --verbose </dev/null` (real config, read-only prompt); transcript in `$W/live/c03.jsonl`, parsed below. Probe exit 0 iff a `tool_result` with a quote comes back from a `tool_use` named `mcp__market-watch__quote`.
- output (verbatim):

```
## c03.jsonl
init tools(market*): ['mcp__market-watch__quote'] | model: claude-haiku-4-5-20251001 | claude_code_version: 2.1.287
TOOL_USE name= ToolSearch {"query": "select:mcp__market-watch__quote", "max_results": 1}
TOOL_RESULT is_error= None [{"type": "tool_reference", "tool_name": "mcp__market-watch__quote"}]
TOOL_USE name= mcp__market-watch__quote {"symbols": ["AAPL"]}
TOOL_RESULT is_error= None Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2026-10-11T03:30:52Z. Prices may be delayed; not investment advice.
AAPL (Apple Inc.) | price 336.64 USD | day -1.11% | day range 330.7–338.61 | volume 37821157 | as of 2026-10-09T20:00:00Z (market closed; last regular-session price)
ASSISTANT TEXT: **mcp__market-watch__quote** — AAPL: $336.64
RESULT success is_error= False
## c03f.jsonl
init tools(market*): ['mcp__market-watch__quote2'] | model: claude-haiku-4-5-20251001 | claude_code_version: 2.1.287
TOOL_USE name= ToolSearch {"query": "select:mcp__market-watch__quote2", "max_results": 1}
TOOL_RESULT is_error= None [{"type": "tool_reference", "tool_name": "mcp__market-watch__quote2"}]
TOOL_USE name= Bash {"command": "echo \"Calling tool: mcp__market-watch__quote2\""}
TOOL_RESULT is_error= False Calling tool: mcp__market-watch__quote2
TOOL_USE name= mcp__market-watch__quote2 {"symbols": ["AAPL"]}
TOOL_RESULT is_error= True Claude requested permissions to use mcp__market-watch__quote2, but you haven't granted it yet.
ASSISTANT TEXT: I cannot call the tool in this non-interactive session without permission. The tool `mcp__market-watch__quote2` requires authorization that must be granted interactively.
RESULT success is_error= False
```
- falsifier: model call 2 of 2: same prompt with `--plugin-dir $W/modmut-c03` where `name: 'quote'` → `name: 'quote2'` (mutant sha256 aae6dc38…). Probe script exit = 1 (`quote tool returned a quote under name mcp__market-watch__quote: False`, `probe_rc=1`).
- falsifier output (verbatim, trimmed):

```
(see `## c03f.jsonl` above)
```
- notes: OBSERVATION (not a ledger claim): in both runs Haiku first called `ToolSearch` with `select:mcp__market-watch__quote`, which returned a `tool_reference`. That suggests the tool was still deferred despite `isDeferred: false`. In the harness, the spec that reached `tool.register` beneath the plugin had keys `name,description,inputSchema` and no `isDeferred` (see C27 log). Not decisive: a model may call ToolSearch even for a loaded tool. I recommend a late claim.

### C04 — CONFIRMED

- probe: two probes. (a) live: `$W/mod/probes/live-probes.sh <claim> <source dir>`: `env -i PATH=… HOME=$HOME TERM=dumb CLAUDE_CONFIG_DIR=<fresh dir under $W> claude …` (2.1.287); installs via `claude plugin marketplace add <dir>` + `claude plugin install market-watch@claude-market-watch`, then `claude -p "/cmd" </dev/null`; exit 0 iff `/market` reply == `market-watch: Market band hidden.` (the hook's `{ text }` prefixed by the plugin name). (b) harness: `probes/c04.test.ts` asserts `$.command.run(market)` result deep-equals `{ text: 'Market band hidden.' }`.
- output (verbatim):

```
$ probes/live-probes.sh C04 $W/mod
  claude -p "/market" -> market-watch: Market band hidden.
rc=0
$ probes/live-probes.sh C04 $W/modmut-c04   # falsifier
  claude -p "/market" -> market-watch registered /market but no command.run hook answered it: add on("command.run", { command: "market" }, ($, e) => ({ text: ... })) to the plugin.
falsifier_rc=1
--- harness (b) ---
C04 reply {"text":"Market band hidden."}

probes/c04.test.ts:
(pass) C04 harness [97.51ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.32s]
rc=0
```
- falsifier: (live) source copy `$W/modmut-c04`, where the market hook calls `next(e)` instead of returning its text (mutant sha256 cf7d5007…); (harness) the same mutation in `$W/mod/hooks/register.tsx`, then restored
- falsifier output (verbatim, trimmed):

```
mutation [c04] in hooks/register.tsx:
  - on('command.run', { command: 'market' }, async $ => {
  + on('command.run', { command: 'market' }, async ($, e, next) => { if (e) return next(e);
probes/c04.test.ts:
(fail) C04 harness [84.94ms]
  HooksError: no implementation for command.run
  
  nothing beneath the plugins answers command.run: a test answers it with on('command.run', ...)

 0 pass
 1 fail
Ran 1 test across 1 file. [0.30s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```
- notes: The CLI prefixes the hook text with `market-watch: `. The claim is about the text reaching the reply, so I read the prefix as presentation.

### C05 — CONFIRMED

- probe: `$W/mod/probes/live-probes.sh <claim> <source dir>`: `env -i PATH=… HOME=$HOME TERM=dumb CLAUDE_CONFIG_DIR=<fresh dir under $W> claude …` (2.1.287); installs via `claude plugin marketplace add <dir>` + `claude plugin install market-watch@claude-market-watch`, then `claude -p "/cmd" </dev/null`. Run 1 `/watch set TSLA NVDA`, run 2 (new process, same config dir) `/watch`; exit 0 iff run 2 == `market-watch: Watching: TSLA, NVDA`.
- output (verbatim):

```
$ probes/live-probes.sh C05 $W/mod
  claude -p "/watch set TSLA NVDA" -> market-watch: Watching: TSLA, NVDA
  claude -p "/watch" -> market-watch: Watching: TSLA, NVDA
rc=0
$ probes/live-probes.sh C05 $W/modmut-c05   # falsifier
  claude -p "/watch set TSLA NVDA" -> market-watch: Watching: TSLA, NVDA
  claude -p "/watch" -> market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL
falsifier_rc=1
```
- falsifier: source copy `$W/modmut-c05` with `STORE_WATCHLIST = 'watchlist' + Math.random()`, so each process uses a different store key (mutant sha256 b6730298…)
- falsifier output (verbatim, trimmed):

```
(included above)
```
- notes: Store file seen at `$CLAUDE_CONFIG_DIR/plugins/store/market-watch_claude-market-watch-<hash>.json`, for example `{"watchlist":["TSLA","NVDA","AMD"]}` after a 3-run sequence. **PROBE TRAP FOUND:** with a `directory` marketplace, the CLI ran the code from the marketplace source directory and NOT from the install cache. My first live falsifiers (mutate `$W/mod`, install, restore, then run) therefore ran the restored code and wrongly "survived". I discarded them and re-ran with a separate, never-restored mutant source dir per falsifier.

### C06 — CONFIRMED

- probe: `$W/mod/probes/live-probes.sh <claim> <source dir>`: `env -i PATH=… HOME=$HOME TERM=dumb CLAUDE_CONFIG_DIR=<fresh dir under $W> claude …` (2.1.287); installs via `claude plugin marketplace add <dir>` + `claude plugin install market-watch@claude-market-watch`, then `claude -p "/cmd" </dev/null`. `/market` in run 1 and again in run 2 (new process, same config dir). Exit 0 iff both runs reply `Market band hidden.`. If `$.state` persisted, run 2 would say `shown`. Metamorphic partner: C05 shows that `$.store` DOES persist in the same setup.
- output (verbatim):

```
$ probes/live-probes.sh C06 $W/mod
  claude -p "/market" -> market-watch: Market band hidden.
  claude -p "/market" -> market-watch: Market band hidden.
rc=0
$ probes/live-probes.sh C06 $W/modmut-c06   # falsifier
  claude -p "/market" -> market-watch: Market band hidden.
  claude -p "/market" -> market-watch: Market band shown.
falsifier_rc=1
```
- falsifier: source copy `$W/modmut-c06` with the toggle backed by `$.store.get/set('bandHidden')` instead of `read/update` (mutant sha256 0c93d922…)
- falsifier output (verbatim, trimmed):

```
(included above)
```

### C07 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c07.test.ts`, with an empty store (`mock.store`) and `/watch` (no args). Asserts the list after `Watching: ` === `SPY, META, AAPL, AMZN, NFLX, GOOGL`.
- output (verbatim):

```
C07 reply: {"text":"Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL"}

probes/c07.test.ts:
(pass) C07 default watchlist [79.54ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.28s]
rc=0
```
- falsifier: `DEFAULT_WATCHLIST` order META↔AAPL swapped in `hooks/core.ts`
- falsifier output (verbatim, trimmed):

```
mutation [c07] in hooks/core.ts:
  - ['SPY', 'META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL']
  + ['SPY', 'AAPL', 'META', 'AMZN', 'NFLX', 'GOOGL']
C07 reply: {"text":"Watching: SPY, AAPL, META, AMZN, NFLX, GOOGL"}

probes/c07.test.ts:
(fail) C07 default watchlist [78.43ms]
  AssertionError: expect(received).toBe()
  
  Expected: "SPY, META, AAPL, AMZN, NFLX, GOOGL"
  Received: "SPY, AAPL, META, AMZN, NFLX, GOOGL"

 0 pass
 1 fail
Ran 1 test across 1 file. [0.29s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: Live cross-check in a fresh config dir: `market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL` (C02 log).

### C08 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c08.test.ts`. `/watch add nvda AAPL @@@ NVDA tsla #x`, then `/watch`, then `/watch add SPY`. Asserts the appended list is exact, there is no duplicate AAPL/NVDA/SPY, the reply has `ignored invalid` with both bad tokens, and no invalid token is stored. Cross-session part: live, fresh config `cfg-c08`: `/watch add nvda AAPL @@@ NVDA` → `market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL, NVDA (ignored invalid: @@@)`; next process `/watch` → `market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL, NVDA` (both rc=0).
- output (verbatim):

```
C08 add reply: {"text":"Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL, NVDA, TSLA (ignored invalid: @@@, #x)"}
C08 show reply: {"text":"Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL, NVDA, TSLA"}
C08 dup-only reply: {"text":"Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL, NVDA, TSLA"}

probes/c08.test.ts:
(pass) C08 add semantics [88.78ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.31s]
rc=0
```
- falsifier: `applyWatch` add-branch duplicate filter removed (`[...current, ...cmd.symbols]`)
- falsifier output (verbatim, trimmed):

```
mutation [c08] in hooks/core.ts:
  - case 'add': return [...current, ...cmd.symbols.filter(s => !current.includes(s))]
  + case 'add': return [...current, ...cmd.symbols]
probes/c08.test.ts:
(fail) C08 add semantics [97.80ms]
  AssertionError: expect(received).toEqual()
  
  Expected: [
    "SPY",
    "META",
    "AAPL",
    "AMZN",
    "NFLX",
    "GOOGL",
    "NVDA",
    "TSLA"
  ]
  Received: [
    "SPY",
    "META",
    "AAPL",
    "AMZN",
... [7 lines elided] ...
 0 pass
 1 fail
Ran 1 test across 1 file. [0.31s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: The cross-session persistence falsifier is C05's (same store mechanism).

### C09 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c09.test.ts`. `set` with 15 symbols; `add` 5 more; `reset` then 4×`add` of 2; `set` with 12; `add` 1. Records the list length after each step and asserts max ≤ 12. Live cross-check, fresh config `cfg-c09`: `/watch set A … O` (15) → `market-watch: Watching: A, B, C, D, E, F, G, H, I, J, K, L`; next process `/watch` → the same 12.
- output (verbatim):

```
C09 sizes: [12,12,8,10,12,12,12,12]

probes/c09.test.ts:
(pass) C09 cap 12 [126.68ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.35s]
rc=0
```
- falsifier: `MAX_WATCHLIST = 12` → `13`
- falsifier output (verbatim, trimmed):

```
mutation [c09] in hooks/core.ts:
  - export const MAX_WATCHLIST = 12
  + export const MAX_WATCHLIST = 13
C09 sizes: [13,13,8,10,12,13,12,13]

probes/c09.test.ts:
(fail) C09 cap 12 [143.50ms]
  AssertionError: expect(received).toBeLessThanOrEqual()
  
  Expected: <= 12
  Received: 13

 0 pass
 1 fail
Ran 1 test across 1 file. [0.35s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: Side observation (not a claim violation): `/watch add` past the cap drops the new symbols silently. The reply just lists the 12 kept and does not say anything was dropped.

### C10 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c10.test.ts`. Fake price 123.45 and day change 1.23. `/quote nvda` asserts the reply contains NVDA, 123.45 and 1.23%, and that a `ui.open` call with `id: 'market-quote'` was captured beneath the plugin.
- output (verbatim):

```
C10 reply: {"text":"NVDA 123.45 ▲1.23%"} opens: [{"id":"market-quote","title":"NVDA"}]

probes/c10.test.ts:
(pass) C10 /quote reply + open [75.58ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.30s]
rc=0
```
- falsifier: `PANE = 'market-quote'` → `'market-quotes'`
- falsifier output (verbatim, trimmed):

```
mutation [c10] in hooks/register.tsx:
  - const PANE = 'market-quote'
  + const PANE = 'market-quotes'
C10 reply: {"text":"NVDA 123.45 ▲1.23%"} opens: [{"id":"market-quotes","title":"NVDA"}]

probes/c10.test.ts:
(fail) C10 /quote reply + open [85.32ms]
  AssertionError: expect(received).toBe()
  
  Expected: true
  Received: false

 0 pass
 1 fail
Ran 1 test across 1 file. [0.29s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```
- notes: Live cross-check: `claude -p "/quote AAPL"` (fresh config) → `market-watch: AAPL 336.64 ▼1.11%`. Independent `curl -A Mozilla/5.0 https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=5m` gave regularMarketPrice 336.64 and regularMarketChangePercent -1.11. They agree. The live run cannot observe `ui.open` in `-p` mode, so the pane-open part rests on the harness only.

### C11 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c11.test.tsx`. After `/quote NVDA`, `$.ui.mount({ surface: terminal|desktop, component: 'Pane', requestId: 'market-quote', props })`. Asserts the mount resolved (validation passed) and that the drawing has an element starting `NVDA`, `123.45`, and ≥3 sparkline glyphs. The fake shortName is `Acme Corp`, so only the symbol field can supply `NVDA`.
- output (verbatim):

```
C11 terminal text: "NVDA · Acme Corp123.45 USD ▲1.23%▁▁██chart low 90.00 · high 123.45day range 122.45–124.45volume 1,000as of 2027-01-15 05:23 UTC\nNVDA · Acme Corp\n123.45 USD ▲1.23%\n▁▁██\nchart low 90.00 · high 123.45\nday range 122.45–124.45\nvolume 1,000\nas of 2027-01-15 05:23 UTC"
C11 desktop text: "NVDA · Acme Corp123.45 USD ▲1.23%▁▁██chart low 90.00 · high 123.45day range 122.45–124.45volume 1,000as of 2027-01-15 05:23 UTC\nNVDA · Acme Corp\n123.45 USD ▲1.23%\n▁▁██\nchart low 90.00 · high 123.45\nday range 122.45–124.45\nvolume 1,000\nas of 2027-01-15 05:23 UTC"

probes/c11.test.tsx:
(pass) C11 pane on terminal [100.50ms]
(pass) C11 pane on desktop [42.11ms]

 2 pass
 0 fail
Ran 2 tests across 1 file. [0.35s]
rc=0
```
- falsifier: three separate mutants: (i) header `{q.symbol} · {q.name}` → `{q.name}`; (ii) sparkline text → `''`; (iii) `<Box />` nested inside `<Text>` (validation). All three fail on both surfaces.
- falsifier output (verbatim, trimmed):

```
mutation [c11] in hooks/register.tsx:
  - <Text bold>{q.symbol} · {q.name}</Text>
  + <Text bold>{q.name}</Text>
C11 terminal text: "Acme Corp123.45 USD ▲1.23%▁▁██chart low 90.00 · high 123.45day range 122.45–124.45volume 1,000as of 2027-01-15 05:23 UTC\nAcme Corp\n123.45 USD ▲1.23%\n▁▁██\nchart low 90.00 · high 123.45\nday range 122.45–124.45\nvolume 1,000\nas of 2027-01-15 05:23 UTC"
C11 desktop text: "Acme Corp123.45 USD ▲1.23%▁▁██chart low 90.00 · high 123.45day range 122.45–124.45volume 1,000as of 2027-01-15 05:23 UTC\nAcme Corp\n123.45 USD ▲1.23%\n▁▁██\nchart low 90.00 · high 123.45\nday range 122.45–124.45\nvolume 1,000\nas of 2027-01-15 05:23 UTC"

probes/c11.test.tsx:
(fail) C11 pane on terminal [88.16ms]
  AssertionError: expect(received).toBeDefined()
  
  Expected: defined
  Received: undefined
(fail) C11 pane on desktop [44.55ms]
  AssertionError: expect(received).toBeDefined()
  
  Expected: defined
  Received: undefined

 0 pass
 2 fail
Ran 2 tests across 1 file. [0.34s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
--- (ii) ---
mutation [c11b] in hooks/register.tsx:
  - <Text>{sparkline(q.closes, width)}</Text>
  + <Text>{''}</Text>
C11 terminal text: "NVDA · Acme Corp123.45 USD ▲1.23%chart low 90.00 · high 123.45day range 122.45–124.45volume 1,000as of 2027-01-15 05:23 UTC\nNVDA · Acme Corp\n123.45 USD ▲1.23%\n\nchart low 90.00 · high 123.45\nday range 122.45–124.45\nvolume 1,000\nas of 2027-01-15 05:23 UTC"
C11 desktop text: "NVDA · Acme Corp123.45 USD ▲1.23%chart low 90.00 · high 123.45day range 122.45–124.45volume 1,000as of 2027-01-15 05:23 UTC\nNVDA · Acme Corp\n123.45 USD ▲1.23%\n\nchart low 90.00 · high 123.45\nday range 122.45–124.45\nvolume 1,000\nas of 2027-01-15 05:23 UTC"

probes/c11.test.tsx:
(fail) C11 pane on terminal [96.81ms]
  AssertionError: expect(received).toBe()
  
... [10 lines elided] ...
Ran 2 tests across 1 file. [0.36s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
--- (iii) ---
mutation [c11c] in hooks/register.tsx:
  - <Text>{sparkline(q.closes, width)}</Text>
  + <Text>{sparkline(q.closes, width)}<Box /></Text>
probes/c11.test.tsx:
(fail) C11 pane on terminal [92.59ms]
  HooksError: $.ui.mount: market-watch drew nothing on the terminal surface: market-watch: ui.render (Pane) refused: Box inside an inline element; the engine drew its own
  
  the engine reported:
    market-watch: ui.render (Pane) refused: Box inside an inline element; the engine drew its own
(fail) C11 pane on desktop [38.19ms]
  HooksError: $.ui.mount: market-watch drew nothing on the desktop surface: market-watch: ui.render (Pane) refused: Box inside an inline element; the engine drew its own
  
  the engine reported:
    market-watch: ui.render (Pane) refused: Box inside an inline element; the engine drew its own

 0 pass
 2 fail
Ran 2 tests across 1 file. [0.33s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```

### C12 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c12.test.ts`. Market-open session. `/watch add NVDA`, `/alert NVDA > 150`, then 60 s polls at prices 140, 151, 152, 153. Asserts toast count is 0 before crossing, 1 after the first poll above L, still 1 after two more polls above L, and `/alert` lists `(fired, waiting to re-arm)`.
- output (verbatim):

```
C12 add: {"text":"Added a1  NVDA > 150."}
C12 toasts: ["🔔 NVDA > 150: now 151.00"] counts 0 1 1 list: {"text":"a1  NVDA > 150  (fired, waiting to re-arm)"}

probes/c12.test.ts:
(pass) C12 fire once [110.00ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.33s]
rc=0
```
- falsifier: armed branch never disarms (`isArmed: !isPast` → `isArmed: true`)
- falsifier output (verbatim, trimmed):

```
mutation [c12] in hooks/core.ts:
  - if (rule.isArmed) return { isFired: isPast, isArmed: !isPast }
  + if (rule.isArmed) return { isFired: isPast, isArmed: true }
C12 add: {"text":"Added a1  NVDA > 150."}
C12 toasts: ["🔔 NVDA > 150: now 151.00","🔔 NVDA > 150: now 152.00","🔔 NVDA > 150: now 153.00"] counts 0 1 3 list: {"text":"a1  NVDA > 150"}

probes/c12.test.ts:
(fail) C12 fire once [108.72ms]
  AssertionError: expect(received).toBe()
  
  Expected: 1
  Received: 3

 0 pass
 1 fail
Ran 1 test across 1 file. [0.32s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```

### C13 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c13.test.ts`. `>` L=100 price sequence 101, 99.6, 99.51, 99.4, 101 → fired-state [T,T,T,F,T], 2 toasts. `<` L=100 sequence 99, 100.4, 100.49, 100.6, 99 → [T,T,T,F,T], 2 toasts. Points inside the 0.5% band (99.51, 100.49) must not re-arm; points outside (99.4, 100.6) must.
- output (verbatim):

```
C13> states(fired?): [true,true,true,false,true] toasts 2
C13< states(fired?): [true,true,true,false,true] toasts 2

probes/c13.test.ts:
(pass) C13 hysteresis > [96.16ms]
(pass) C13 hysteresis < [49.12ms]

 2 pass
 0 fail
Ran 2 tests across 1 file. [0.36s]
rc=0
```
- falsifier: `REARM_FRACTION = 0.005` → `0.003`
- falsifier output (verbatim, trimmed):

```
mutation [c13] in hooks/core.ts:
  - export const REARM_FRACTION = 0.005
  + export const REARM_FRACTION = 0.003
C13> states(fired?): [true,false,false,false,true] toasts 2
C13< states(fired?): [true,false,false,false,true] toasts 2

probes/c13.test.ts:
(fail) C13 hysteresis > [105.79ms]
  AssertionError: expect(received).toEqual()
  
  Expected: [true, true, true, false, true]
  Received: [true, false, false, false, true]
(fail) C13 hysteresis < [66.05ms]
  AssertionError: expect(received).toEqual()
  
  Expected: [true, true, true, false, true]
  Received: [true, false, false, false, true]

 0 pass
 2 fail
Ran 2 tests across 1 file. [0.39s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: Exact-boundary price (99.5 / 100.5) not probed: float rounding of L×0.995 makes that point implementation-defined, and the claim uses strict "below/above".

### C14 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c14.test.ts`. Alert `NVDA > 150`, poll at 151.37. Asserts exactly one `ui.toast` whose text contains NVDA, 150 and 151.37.
- output (verbatim):

```
C14 toasts: ["🔔 NVDA > 150: now 151.37"]

probes/c14.test.ts:
(pass) C14 toast content [95.32ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.31s]
rc=0
```
- falsifier: price removed from the toast template
- falsifier output (verbatim, trimmed):

```
mutation [c14] in hooks/register.tsx:
  - ${rule.level}: now ${formatPrice(q.price)}
  + ${rule.level}: now
C14 toasts: ["🔔 NVDA > 150: now"]

probes/c14.test.ts:
(fail) C14 toast content [104.06ms]
  AssertionError: expect(received).toContain()
  
  Expected: containing "151.37"
  Received: "🔔 NVDA > 150: now"

 0 pass
 1 fail
Ran 1 test across 1 file. [0.32s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```

### C15 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c15.test.ts`. Two `/market` runs in one engine session; asserts exact replies.
- output (verbatim):

```
C15 replies: [{"text":"Market band hidden."},{"text":"Market band shown."}]

probes/c15.test.ts:
(pass) C15 market toggle [62.98ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.27s]
rc=0
```
- falsifier: toggle replaced by constant `isHidden = true`
- falsifier output (verbatim, trimmed):

```
mutation [c15] in hooks/register.tsx:
  - const isHidden = !(await read($, isBandHidden))
  + const isHidden = true
C15 replies: [{"text":"Market band hidden."},{"text":"Market band hidden."}]

probes/c15.test.ts:
(fail) C15 market toggle [88.94ms]
  AssertionError: expect(received).toBe()
  
  Expected: "Market band shown."
  Received: "Market band hidden."

 0 pass
 1 fail
Ran 1 test across 1 file. [0.30s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```

### C16 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c16.test.ts`. `/watch set ZM AAPL MSFT BA` (non-alphabetical order, distinct prices 70.11/230.22/1234.56/180.33), then one 60 s poll. Asserts the last `ui.status` text has every symbol, the indexes increase in watchlist order, each symbol is followed by `<price> <arrow><pct>%`, and each price is present.
- output (verbatim):

```
C16 statuses: ["ZM 70.11 ▲1.23% · AAPL 230.22 ▲1.23% · MSFT 1235 ▲1.23% · BA 180.33 ▲1.23%","ZM 70.11 ▲1.23% · AAPL 230.22 ▲1.23% · MSFT 1235 ▲1.23% · BA 180.33 ▲1.23%"]
C16 indexes: [0,18,39,58]

probes/c16.test.ts:
(pass) C16 status line [68.50ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.27s]
rc=0
```
- falsifier: `formatTicker` sorts the list (`[...list].sort()`)
- falsifier output (verbatim, trimmed):

```
mutation [c16] in hooks/core.ts:
  -   return list
    .map(symbol => {
  +   return [...list].sort()
    .map(symbol => {
C16 statuses: ["AAPL 230.22 ▲1.23% · BA 180.33 ▲1.23% · MSFT 1235 ▲1.23% · ZM 70.11 ▲1.23%","AAPL 230.22 ▲1.23% · BA 180.33 ▲1.23% · MSFT 1235 ▲1.23% · ZM 70.11 ▲1.23%"]
C16 indexes: [59,0,40,21]

probes/c16.test.ts:
(fail) C16 status line [88.18ms]
  AssertionError: expect(received).toEqual()
  
  Expected: [59, 0, 40, 21]
  Received: [0, 21, 40, 59]

 0 pass
 1 fail
Ran 1 test across 1 file. [0.29s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: Prices ≥ 1000 are printed with 0 decimals (MSFT 1234.56 → `1235`). The probe accepted either form. This is a display choice, not a claim violation.

### C17 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c17.test.tsx`. The fake has quotes for ^VIX 17.25 and ^TNX 4.11, plus a host `ui.render` for `AbovePrompt` registered beneath the plugin that draws `HOST-BAND`. Mount the AbovePrompt on the terminal; assert `VIX 17.25` and `10Y 4.11`; `press({ key: 'hide' })`; redraw; assert the drawing is only `HOST-BAND` (no VIX, no 10Y, no hide button).
- output (verbatim):

```
C17 before: "Market open · VIX 17.25 ▲1.23% · 10Y 4.11% · last trade 157m ago Hide|Market open · VIX 17.25 ▲1.23% · 10Y 4.11% · last trade 157m ago |Hide"
C17 press result: {"element":"hide"}
C17 after: "HOST-BAND"
C17 hostDraws 2

probes/c17.test.tsx:
(pass) C17 band + hide [90.67ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.31s]
rc=0
```
- falsifier: Hide `onPress` sets `isBandHidden` to `false`
- falsifier output (verbatim, trimmed):

```
mutation [c17] in hooks/register.tsx:
  - onPress={() => update($, isBandHidden, () => true)}
  + onPress={() => update($, isBandHidden, () => false)}
C17 before: "Market open · VIX 17.25 ▲1.23% · 10Y 4.11% · last trade 157m ago Hide|Market open · VIX 17.25 ▲1.23% · 10Y 4.11% · last trade 157m ago |Hide"
C17 press result: {"element":"hide"}
C17 after: "Market open · VIX 17.25 ▲1.23% · 10Y 4.11% · last trade 157m ago Hide|Market open · VIX 17.25 ▲1.23% · 10Y 4.11% · last trade 157m ago |Hide"
C17 hostDraws 0

probes/c17.test.tsx:
(fail) C17 band + hide [88.03ms]
  AssertionError: expect(received).toBe()
  
  Expected: true
  Received: false

 0 pass
 1 fail
Ran 1 test across 1 file. [0.30s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```
- notes: Desktop surface not probed for C17 (the claim names no surface). First attempt was PROBE_INVALID ("no implementation for ui.render" after Hide, because nothing beneath answered the fall-through). Fixed by adding the host marker.

### C18 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c18.test.ts`. One tool call per range in {5d,1mo,3mo,6mo,ytd,1y}, each with a different (price, chartPreviousClose). The expected value is computed in the probe as `((price/base − 1)×100).toFixed(2)`. Asserts the request used `range=<R>` and the printed return equals the expected string.
- output (verbatim):

```
C18 5d: expected 13.40% ; urls ["https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=5d&interval=30m"]
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
NVDA (Acme Corp) | price 110 USD | day 1.23% | 5d return 13.40% (from 97) | day range 109–111 | volume 1000 | as of 2027-01-15T05:23:20Z
C18 1mo: expected -3.93% ; urls ["https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=1mo&interval=1d"]
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
NVDA (Acme Corp) | price 250.5 USD | day 1.23% | 1mo return -3.93% (from 260.75) | day range 249.5–251.5 | volume 1000 | as of 2027-01-15T05:23:20Z
C18 3mo: expected 11.11% ; urls ["https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=3mo&interval=1d"]
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
NVDA (Acme Corp) | price 33.333 USD | day 1.23% | 3mo return 11.11% (from 30) | day range 32.333–34.333 | volume 1000 | as of 2027-01-15T05:23:20Z
C18 6mo: expected 0.00% ; urls ["https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=6mo&interval=1d"]
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
NVDA (Acme Corp) | price 1000 USD | day 1.23% | 6mo return 0.00% (from 999.99) | day range 999–1001 | volume 1000 | as of 2027-01-15T05:23:20Z
C18 ytd: expected 10.89% ; urls ["https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=ytd&interval=1d"]
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
NVDA (Acme Corp) | price 77.7 USD | day 1.23% | ytd return 10.89% (from 70.07) | day range 76.7–78.7 | volume 1000 | as of 2027-01-15T05:23:20Z
C18 1y: expected 117.64% ; urls ["https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=1y&interval=1d"]
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
NVDA (Acme Corp) | price 12.34 USD | day 1.23% | 1y return 117.64% (from 5.67) | day range 11.34–13.34 | volume 1000 | as of 2027-01-15T05:23:20Z

probes/c18.test.ts:
(pass) C18 return 5d [67.23ms]
(pass) C18 return 1mo [33.98ms]
(pass) C18 return 3mo [25.72ms]
(pass) C18 return 6mo [23.29ms]
(pass) C18 return ytd [22.84ms]
(pass) C18 return 1y [22.19ms]

 6 pass
 0 fail
Ran 6 tests across 1 file. [0.42s]
rc=0
```
- falsifier: return printed `.toFixed(1)`
- falsifier output (verbatim, trimmed):

```
mutation [c18] in hooks/core.ts:
  - ((quote.price / rangeBaseClose - 1) * 100).toFixed(2)
  + ((quote.price / rangeBaseClose - 1) * 100).toFixed(1)
(fail) C18 return 1mo [35.19ms]
  AssertionError: expect(received).toBe()
  
  Expected: "-3.93"
  Received: "-3.9"
(fail) C18 return 3mo [33.68ms]
  AssertionError: expect(received).toBe()
  
  Expected: "11.11"
  Received: "11.1"
(fail) C18 return 6mo [36.08ms]
  AssertionError: expect(received).toBe()
  
  Expected: "0.00"
  Received: "0.0"
(fail) C18 return ytd [29.54ms]
  AssertionError: expect(received).toBe()
  
  Expected: "10.89"
... [7 lines elided] ...
 0 pass
 6 fail
Ran 6 tests across 1 file. [0.46s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: Formula and rounding are confirmed against the response the mod receives. Whether Yahoo's `chartPreviousClose` is the right base for a period return is a data-semantics question this probe does not decide. `1d` prints no period return by design.

### C19 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c19.test.ts`. (a) inputs `[]`, `['!!!']`, `['a b c','$$']`, `'AAPL'` (not an array), and a missing `symbols` each return `{ deny }` with zero fetches; (b) 12 valid symbols → exactly 8 fetches.
- output (verbatim):

```
C19 deny outs: [{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"}] fetches 0
C19 cap: fetches 8 lines 9 ["A","B","C","D","E","F","G","H"]

probes/c19.test.ts:
(pass) C19 deny on no valid symbol [53.52ms]
(pass) C19 cap 8 [29.26ms]

 2 pass
 0 fail
Ran 2 tests across 1 file. [0.28s]
rc=0
```
- falsifier: (a) deny guard `=== 0` → `< 0`; (b) `MAX_TOOL_SYMBOLS` 8 → 9. Each kills its own test.
- falsifier output (verbatim, trimmed):

```
mutation [c19a] in hooks/register.tsx:
  - if (symbols.length === 0) return { deny:
  + if (symbols.length < 0) return { deny:
C19 deny outs: [{"result":"Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice."},{"result":"Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice."},{"result":"Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice."},{"result":"Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice."},{"result":"Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice."}] fetches 0
C19 cap: fetches 8 lines 9 ["A","B","C","D","E","F","G","H"]

probes/c19.test.ts:
(fail) C19 deny on no valid symbol [89.98ms]
  AssertionError: expect(received).toBeDefined()
  
  Expected: defined
  Received: undefined
(pass) C19 cap 8 [35.83ms]

... [2 lines elided] ...
Ran 2 tests across 1 file. [0.35s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
--- (b) ---
mutation [c19b] in hooks/core.ts:
  - export const MAX_TOOL_SYMBOLS = 8
  + export const MAX_TOOL_SYMBOLS = 9
C19 deny outs: [{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"},{"deny":"quote: give 1-8 ticker symbols, e.g. {\"symbols\": [\"AAPL\"]}"}] fetches 0
C19 cap: fetches 9 lines 10 ["A","B","C","D","E","F","G","H","I"]

probes/c19.test.ts:
(pass) C19 deny on no valid symbol [80.06ms]
(fail) C19 cap 8 [40.40ms]
  AssertionError: expect(received).toBeLessThanOrEqual()
  
  Expected: <= 8
  Received: 9

... [2 lines elided] ...
Ran 2 tests across 1 file. [0.34s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: A non-array `symbols` (`'AAPL'`) is denied, not coerced.

### C20 — CONFIRMED (scoped to quote lines; see boundary)

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c20.test.ts`. Session end E. Tool called at E+6 min, E+5 min+1 s and E+1 h: every quote line has an ISO `as of` and `market closed`. At E−1 h (in session): `as of` present, no flag.
- output (verbatim):

```
C20 +6min:
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:06:00Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
MSFT (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
^VIX (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
C20 +5min+1s:
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:05:01Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
MSFT (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
^VIX (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
C20 +1h:
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T09:00:00Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
MSFT (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
^VIX (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
C20 -1h(in session):
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T07:00:00Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
MSFT (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
^VIX (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
C20 error-line output:
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:06:00Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
ERROR ZZZZ: No data found

probes/c20.test.ts:
(pass) C20 +6min [57.47ms]
(pass) C20 +5min+1s [27.36ms]
(pass) C20 +1h [25.06ms]
(pass) C20 -1h(in session) [25.29ms]
(pass) C20 error line (literal-reading attack) [29.60ms]

 5 pass
 0 fail
Ran 5 tests across 1 file. [0.37s]
rc=0
```
- falsifier: `fetchedAtMs > end + CLOSE_GRACE_MS` → `> end + 2*CLOSE_GRACE_MS`
- falsifier output (verbatim, trimmed):

```
mutation [c20] in hooks/core.ts:
  - fetchedAtMs > quote.session.endMs + CLOSE_GRACE_MS
  + fetchedAtMs > quote.session.endMs + 2 * CLOSE_GRACE_MS
^VIX (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z (market closed; last regular-session price)
C20 -1h(in session):
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T07:00:00Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
MSFT (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
^VIX (Acme Corp) | price 100 USD | day 1.23% | 5d return 11.11% (from 90) | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
C20 error-line output:
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:06:00Z. Prices may be delayed; not investment advice.
AAPL (Acme Corp) | price 100 USD | day 1.23% | day range 99–101 | volume 1000 | as of 2027-01-15T01:40:00Z
ERROR ZZZZ: No data found

probes/c20.test.ts:
(fail) C20 +6min [90.52ms]
  AssertionError: expect(received).toBe()
  
  Expected: true
  Received: false
(fail) C20 +5min+1s [34.74ms]
  AssertionError: expect(received).toBe()
... [7 lines elided] ...
 3 pass
 2 fail
Ran 5 tests across 1 file. [0.43s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: **Boundary (literal reading):** an `ERROR <SYM>: …` line (unknown or timed-out symbol) has NO as-of timestamp, and the header line has `Fetched <ISO>` but not `as of`. If "every result line" means every line, C20 is REFUTED by `ERROR ZZZZ: No data found`. If it means every line that reports a quote, it holds. I recommend that the ledger owner pick the reading. Live cross-check (C03 run): `… as of 2026-10-09T20:00:00Z (market closed; last regular-session price)`, fetched 2026-10-11T03:30:52Z (Saturday).

### C21 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c21.test.ts`. Runs every network path: session-start poll, `/watch add BRK.B EURUSD=X ES=F` (forced poll), `/quote TSLA`, an alert, a timer poll, and 7 tool calls (each range, symbols AAPL and ^GSPC). 56 fetches. Asserts each is `https:` + host `query1.finance.yahoo.com` + path `/v8/finance/chart/<one segment>`.
- output (verbatim):

```
C21 total fetches 56 distinct dest ["https://query1.finance.yahoo.com/v8/finance/chart/<SYM>"]
C21 sample urls ["https://query1.finance.yahoo.com/v8/finance/chart/EURUSD%3DX?range=1d&interval=5m","https://query1.finance.yahoo.com/v8/finance/chart/ES%3DF?range=1d&interval=5m","https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=5m","https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?range=1d&interval=5m"] sample init {"headers":{"User-Agent":"Mozilla/5.0"}}
C21/C22 violations []

probes/c21.test.ts:
(pass) C21/C22 all paths [99.91ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.31s]
rc=0
```
- falsifier: host `query1` → `query2` in `chartUrl`
- falsifier output (verbatim, trimmed):

```
mutation [c21] in hooks/core.ts:
  - https://query1.finance.yahoo.com/v8/finance/chart/
  + https://query2.finance.yahoo.com/v8/finance/chart/
    "dest https://query2.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1d&interval=5m",
    "dest https://query2.finance.yahoo.com/v8/finance/chart/AAPL?range=5d&interval=30m",
    "dest https://query2.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5d&interval=30m",
... [21 lines elided] ...
  ]

 0 pass
 1 fail
Ran 1 test across 1 file. [0.38s]
rc=1
falsifier_rc=1
restore sha256 21feceb0bef92a2565da5250d06b598ecef6f4b4858c0d598831cd5f1bfd5cca  hooks/core.ts
```
- notes: Any other engine I/O op (process.run, fs.*, env.get, …) has no implementation beneath the plugin in this harness, so it would have failed the test. So `http.fetch` is the only outbound channel on these paths. Not covered: code paths no probe triggers.

### C22 — CONFIRMED

- probe: same probe as C21 (`probes/c21.test.ts`). The tool calls carry the extra input fields `note: 'SECRET-TRANSCRIPT-TEXT'` and `apiKey: 'SECRET-KEY'`. For all 56 requests it asserts: query keys are exactly `interval,range`; `init` keys are exactly `headers`; header keys are exactly `User-Agent`; and no `SECRET` appears in the URL or init. No `mock.env` was set, so any `$.env.get` call would have failed the test.
- output (verbatim):

```
C21 total fetches 56 distinct dest ["https://query1.finance.yahoo.com/v8/finance/chart/<SYM>"]
C21 sample urls ["https://query1.finance.yahoo.com/v8/finance/chart/EURUSD%3DX?range=1d&interval=5m","https://query1.finance.yahoo.com/v8/finance/chart/ES%3DF?range=1d&interval=5m","https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=5m","https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?range=1d&interval=5m"] sample init {"headers":{"User-Agent":"Mozilla/5.0"}}
C21/C22 violations []

probes/c21.test.ts:
(pass) C21/C22 all paths [99.91ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.31s]
rc=0
```
- falsifier: an extra header `X-Ctx: 'probe'` added to the fetch init
- falsifier output (verbatim, trimmed):

```
mutation [c22] in hooks/register.tsx:
  - { headers: { 'User-Agent': 'Mozilla/5.0' } }
  + { headers: { 'User-Agent': 'Mozilla/5.0', 'X-Ctx': 'probe' } }
    "headers User-Agent,X-Ctx",
    "headers User-Agent,X-Ctx",
    "headers User-Agent,X-Ctx",
... [21 lines elided] ...
  ]

 0 pass
 1 fail
Ran 1 test across 1 file. [0.32s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```

### C23 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c23.test.ts`. The fake fetch for `SLOW` never answers. (a) Tool `[SLOW, AAPL]`: not settled at 7.9 s; at 8.0 s it resolves (not rejects) with `ERROR SLOW: timed out after 8s` and the AAPL line. (b) Poll with SPY never answering: after 8 s the status shows `SPY …` and the META and GOOGL prices.
- output (verbatim):

```
C23 tool resolved-at-7.9s: false rejected: null 
Source: Yahoo Finance chart API (unofficial, keyless). Fetched 2027-01-15T08:00:00Z. Prices may be delayed; not investment advice.
ERROR SLOW: timed out after 8s
AAPL (Acme Corp) | price 222.22 USD | day 1.23% | day range 221.22–223.22 | volume 1000 | as of 2027-01-15T05:23:20Z
C23 poll statuses: ["SPY … · META 555.55 ▲1.23% · AAPL 100.00 ▲1.23% · AMZN 100.00 ▲1.23% · NFLX 100.00 ▲1.23% · GOOGL 166.66 ▲1.23%"]

probes/c23.test.ts:
(pass) C23 tool: slow symbol times out at 8s, others load [89.13ms]
(pass) C23 poll: slow symbol does not sink the poll [48.13ms]

 2 pass
 0 fail
Ran 2 tests across 1 file. [0.35s]
rc=0
```
- falsifier: `FETCH_TIMEOUT_MS` 8_000 → 9_000 (both tests fail: not settled at 8 s; poll status not set)
- falsifier output (verbatim, trimmed):

```
mutation [c23] in hooks/register.tsx:
  - const FETCH_TIMEOUT_MS = 8_000
  + const FETCH_TIMEOUT_MS = 9_000
C23 tool resolved-at-7.9s: false rejected: null 
NOT SETTLED at 8s
C23 poll statuses: []

probes/c23.test.ts:
(fail) C23 tool: slow symbol times out at 8s, others load [311.91ms]
  AssertionError: expect(received).not.toBeNull()
  
  Expected: not null
  Received: null
(fail) C23 poll: slow symbol does not sink the poll [75.21ms]
  AssertionError: expect(received).toContain()
  
  Expected: containing "META 555.55"
  Received: ""

 0 pass
 2 fail
Ran 2 tests across 1 file. [0.60s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```
- notes: The poller is sequential, so in (b) the symbols after the slow one wait the full 8 s. They still load, as claimed.

### C24 — CONFIRMED

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c24.test.ts`. The session ended 2 h before now. The first poll fetches 8 (6 watchlist + ^VIX + ^TNX). Timer polls at +1…+14 min: cumulative fetch count stays 8; at +15 min it is 16. Controls: an in-session market fetches again at +1 min; 4 min after close (inside grace) also fetches at +1 min.
- output (verbatim):

```
C24 first poll fetches 8 per-minute cumulative 1..14 [8,8,8,8,8,8,8,8,8,8,8,8,8,8] at 15min 16
C24 control open: first 8 after 1 min 16
C24 grace (+4min): first 8 after 1 min 16

probes/c24.test.ts:
(pass) C24 closed: no fetch before 15 min [88.50ms]
(pass) C24 control: open market polls every minute [44.29ms]
(pass) C24 grace: 4 min after close still counts as open [38.50ms]

 3 pass
 0 fail
Ran 3 tests across 1 file. [0.39s]
rc=0
```
- falsifier: `CLOSED_POLL_MS` 15 min → 5 min
- falsifier output (verbatim, trimmed):

```
mutation [c24] in hooks/register.tsx:
  - const CLOSED_POLL_MS = 15 * 60_000
  + const CLOSED_POLL_MS = 5 * 60_000
C24 first poll fetches 8 per-minute cumulative 1..14 [8,8,8,8,16,16,16,16,16,24,24,24,24,24] at 15min 32
C24 control open: first 8 after 1 min 16
C24 grace (+4min): first 8 after 1 min 16

probes/c24.test.ts:
(fail) C24 closed: no fetch before 15 min [104.14ms]
  AssertionError: expect(received).toBe()
  
  Expected: true
  Received: false
(pass) C24 control: open market polls every minute [45.71ms]
(pass) C24 grace: 4 min after close still counts as open [37.47ms]

 2 pass
 1 fail
Ran 3 tests across 1 file. [0.41s]
rc=1
falsifier_rc=1
restore sha256 e0a3a4b1c9d483f3806c3f82f4d46f2661313111e6846e5398bf2948b2bd1df4  hooks/register.tsx
```

### C25 — UNVERIFIABLE (by runtime)

- probe: no decisive probe possible. What I observed: under `env -i` (no `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`), 2.1.287 loaded the mod and ran its hooks (C02). That is consistent with "not required", but it cannot show the variable is *ignored* (the result is the same if it were honoured but default-on), and I did not test with the variable set. Documentation is out of Channel B scope.
- output (verbatim):

```
(see C02)
```

### C26 — UNVERIFIABLE (by runtime)

- probe: only one version is available: CLI 2.1.287 loads mods (C02). I cannot install 2.1.286 or older to show a lower bound, and Desktop 2.1.286 cannot be tested from here. Documentation is out of Channel B scope.
- output (verbatim):

```
(see C02)
```

### C27 — REFUTED (minor; method-dependent)

- probe: `claude plugin test <stage dir>` via `$W/run.sh <label> <probe>` (stages `$W/mod` minus `probes/` and `docs/`, plus `probes/world.ts` and the one probe file; Claude Code 2.1.287 kit, fake clock/store/network beneath the plugin): `probes/c27.test.ts`. Captures the spec that reaches `tool.register` beneath the plugin and measures it in several ways.
- output (verbatim):

```
C27 registered commands ["watch","quote","alert","market"]
C27 spec keys name,description,inputSchema isDeferred undefined
C27 name "quote" 5
C27 description 270 "Live-ish stock/ETF/index quotes from Yahoo Finance. Use instead of recalling prices from memory. Returns price, day change, optional period return over `range`, day range, volume, and an as-of timestamp. Up to 8 symbols per call. Index symbols use a caret (^VIX, ^GSPC)."
C27 inputSchema compact 265 {"type":"object","properties":{"symbols":{"type":"array","items":{"type":"string"},"minItems":1,"maxItems":8},"range":{"type":"string","enum":["1d","5d","1mo","3mo","6mo","ytd","1y"],"description":"Period for the return figure; default 1d"}},"required":["symbols"]}
C27 sum name+desc+compact 540
C27 sum mcpname+desc+compact 559
C27 sum name+desc+pretty 729
C27 JSON.stringify({name,description,input_schema}) 584
C27 JSON.stringify({name:mcp,description,input_schema}) 603

probes/c27.test.ts:
(pass) C27 tool definition length [83.61ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.29s]
rc=0
```
- notes: Measured: name 5 + description 270 + compact JSON schema 265 = **540**. `JSON.stringify({name,description,input_schema})` = **584**. With the full `mcp__market-watch__quote` name: 559 / 603. Pretty-printed schema: 729. None of these equals the claimed 586. The ledger does not say how to measure, and the bytes the engine sends to the model could not be observed (stream-json init lists tool names only; `claude plugin details` showed no tool definition). So the falsifier ("a measured length other than 586") is met under every method I tried, but a method I did not try could give 586.

## Late-claim candidates (for both channels)

1. `isDeferred: false` may not make the quote tool non-deferred in 2.1.287. Haiku had to `ToolSearch select:` it in both C03 runs, and the harness-registered spec had no `isDeferred` key. Unverified.
2. `quote` tool `ERROR` lines carry no as-of timestamp (C20 boundary).
3. `/watch add` past 12 symbols drops the extra symbols and does not say so in the reply (C09 log, sizes 12→12).

## Integrity checks

- Repo checksums vs env-pin (`shasum -a 256 -c` on the 8 listed files, run in `~/dev/claude-market-watch` at the end): every file `OK`, rc=0. `git status --short` at the end: ` M hooks/register.tsx` (pre-existing) and `?? docs/validation/`. HEAD `aee6af5`. Only this report file was written into the repo.
- `~/.claude/settings.json` sha256: start `bcbf072ff987eaee796b6baa794f96a6cb302a34cf8254100441ad5692a956f6`, end `bcbf072ff987eaee796b6baa794f96a6cb302a34cf8254100441ad5692a956f6`. Unchanged.
- User store `~/.claude/plugins/store/market-watch_inline-bfba0e75c049.json`: sha256 `3fb3b3f8…77d5` (content `{"alerts": []}`) before and after both C03 `--plugin-dir` runs. **Its mtime advanced 22:29 → 22:30 → 22:31 (one rewrite per C03 run, content byte-identical).** The `_inline-<hash>` suffix was the same for `--plugin-dir $W/mod` and `--plugin-dir $W/modmut-c03`, so the store is keyed by plugin name, not path. Any `--plugin-dir` run of this mod shares the user's live `market-watch@inline` store.
- Real-config side effects of the 2 permitted model calls: two session transcripts were written under `~/.claude/projects/<cwd-slug>/`. In the falsifier run, Haiku also ran one Bash command, `echo "Calling tool: mcp__market-watch__quote2"`. The user's existing permission settings allowed it, and it was harmless. No state-writing slash command was run against the real config.
- All state-writing `claude` runs (`/watch set|add`, `/market`) used fresh `CLAUDE_CONFIG_DIR`s under `$W` (`cfg-*`) and `env -i`. Network: only `query1.finance.yahoo.com` (through the mod, plus one `curl` for the C10 cross-check). No commits, pushes or submissions.
