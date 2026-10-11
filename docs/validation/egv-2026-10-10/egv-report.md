# EGV report — market-watch, 2026-10-10

- **Mode:** Mode 1, two independent subagents (Channel A docs, Channel B runtime), both Opus. Ledger and env pin pre-registered and checksummed before either channel ran (`ledger.sha256`; re-verified `OK` after both finished).
- **Code under test:** working tree over HEAD `aee6af5` (type alias `$` → `Engine` in `hooks/register.tsx`), checksums in `env-pin.txt`.
- **Claims:** 27 (24 material, 3 minor). Channel A: 16 CONFIRMED / 2 REFUTED / 9 UNVERIFIABLE. Channel B: 24 CONFIRMED / 1 REFUTED / 2 UNVERIFIABLE / 0 PROBE_INVALID (every material CONFIRMED has a recorded failing falsifier).
- **Initial verdict: BLOCKED.** One material sub-claim pair is UNRESOLVED with a documented defect mechanism (C12.2/C13.2, cross-session alert race). Four claims are REJECTED as worded; the behaviour is acceptable and the fix is to the docs (C20, C24, C27, plus the C03 version caveat).

## Convergence gate

| ID | Claim (short) | A | B | Gate |
|---|---|---|---|---|
| C01 | rename → byte-identical JS | CONFIRMED (TS "Erased Types") | CONFIRMED (sha256 equal, 2 option sets; falsifier differs) | **ACCEPTED** |
| C02 | loads on 2.1.287, no env var | UNVERIFIABLE | CONFIRMED (live `claude -p "/watch"`) | SPLIT → C02.1 no env var needed on 2.1.287: A CONFIRMED (OVW), B CONFIRMED → **ACCEPTED**; C02.2 this mod's 4 commands register on 2.1.287: runtime-only (A: "a real `claude -p` run would settle it"), B CONFIRMED, sibling accepted → **ACCEPTED** |
| C03 | `quote` tool callable by model | CONFIRMED, caveat | CONFIRMED (haiku call) | **ACCEPTED** — caveat: `isDeferred: false` needs 2.1.293+; on 2.1.287 the tool sits behind ToolSearch. Docs that say "always in the tool list" must be qualified. |
| C04 | own `command.run` answers with `{text}` | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C05 | `$.store` persists across sessions | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C06 | `$.state` does not persist to a new process | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C07 | default watchlist SPY + FAANG | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C08 | `/watch add` semantics | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C09 | 12-symbol cap | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C10 | `/quote` reply + opens pane | UNVERIFIABLE (Yahoo fields undocumented) | CONFIRMED (+ live cross-check vs curl) | SPLIT → C10.1 `ui.open('market-quote')`: A CONFIRMED (DTS:2451), B CONFIRMED → **ACCEPTED**; C10.2 Yahoo returns the fields read: no primary docs exist for the unofficial endpoint (A N/A), B live: `AAPL 336.64 ▼1.11%` = curl `regularMarketPrice 336.64`, `regularMarketChangePercent -1.11` → **ACCEPTED (runtime-only, endpoint undocumented)** |
| C11 | pane validates on terminal + desktop | UNVERIFIABLE (validation is runtime) | CONFIRMED (mount both surfaces) | SPLIT → C11.1 elements/props in both surface tables: A CONFIRMED (MREF Elements); C11.2 tree validates: runtime-only, B CONFIRMED → **ACCEPTED** |
| C12 | alert fires once | UNVERIFIABLE (documented race) | CONFIRMED (single session) | SPLIT → C12.1 single writer: A (source + contract) agrees, B CONFIRMED → **ACCEPTED**; **C12.2 with two sessions sharing `$.store`: A cites "A `get` followed by a `set` isn't atomic … the second write replaces the first"; B did not probe → UNRESOLVED** |
| C13 | re-arm band 0.5% | UNVERIFIABLE (same race) | CONFIRMED | SPLIT → C13.1 thresholds: **ACCEPTED**; **C13.2 multi-session: UNRESOLVED** (same mechanism as C12.2) |
| C14 | toast on fire | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C15 | `/market` toggles in one session | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C16 | status line text | UNVERIFIABLE (Yahoo field) | CONFIRMED | SPLIT as C10 → **ACCEPTED** (`ui.status` documented; field observed live) |
| C17 | band shows VIX/10Y, Hide works | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C18 | period return formula | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C19 | deny on no symbol, cap 8 | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C20 | *every* tool line has as-of | REFUTED (`ERROR` lines have none) | CONFIRMED scoped to quote lines; notes same boundary | SPLIT → C20.1 every **price** line carries as-of: **ACCEPTED**; C20.2 `ERROR` lines carry as-of: both channels show they do not → **REJECTED as worded**. An error line carries no price, so no stale-price risk. **Fix: docs say "every price line".** |
| C21 | only Yahoo chart host | CONFIRMED | CONFIRMED | **ACCEPTED** |
| C22 | requests carry only symbol/range/interval/UA | UNVERIFIABLE (host may add headers) | CONFIRMED (args the mod passes) | SPLIT → C22.1 the mod passes no `auth`, body or other header: A CONFIRMED (DTS:5194 credentials ride only via `auth`), B CONFIRMED → **ACCEPTED**; C22.2 wire request has no host-added headers: neither channel can observe → **UNRESOLVED, minor** (docs must not claim the wire format) |
| C23 | 8 s timeout, never rejects | UNVERIFIABLE (timing) | CONFIRMED (mock clock) | SPLIT → C23.1 mechanism (race + catch): **ACCEPTED**; C23.2 real wall-clock 8 s: **UNRESOLVED, minor** (A: if a higher-tier hook refuses `clock.after`, only the host's 30 s cap applies) |
| C24 | no fetch < 15 min while closed | REFUTED (forced poll after `/watch` edits; reload resets `lastPollMs`) | CONFIRMED (unforced timer polls) | SPLIT → C24.1 unforced timer polls in one module instance: **ACCEPTED**; C24.2 forced/reload polls: both channels agree they fetch → **REJECTED as worded**; behaviour is intended. **Fix: docs.** |
| C25 | env var ignored from 2.1.287 | CONFIRMED (OVW note) | UNVERIFIABLE by runtime | minor — not blocking; C02.1 covers "not needed" |
| C26 | min versions 2.1.287 / 2.1.286 | CONFIRMED (OVW) | UNVERIFIABLE by runtime | minor — not blocking |
| C27 | tool definition = 586 chars | UNVERIFIABLE | REFUTED (540 compact; 584 JSON; 603 with full name) | minor — **REJECTED; fix PRFAQ figure** |

## Required before submission

1. **Fix C12.2/C13.2.** `checkAlerts` reads the alert list, evaluates it, and writes the whole list back. A second session (or `/alert add|rm` in the same machine) that writes between that read and write is overwritten: a newly added alert can be dropped, or a fired alert re-armed and fired again. Mitigation: re-read the list immediately before writing and apply only the `isArmed` changes, by id, to what is there now. Then probe it with a falsifier.
2. **Doc fixes:** C03 (version caveat on `isDeferred`), C20 ("every price line"), C22 (do not claim the wire headers), C24 (forced poll after `/watch` edits and a poll on each session start), C27 (measured figure and method).

## Side effects observed (Channel B)

- `~/.claude/settings.json` and the repo files matched their pins before and after.
- The two permitted model calls with the real config rewrote `~/.claude/plugins/store/market-watch_inline-bfba0e75c049.json` with byte-identical content (`{"alerts": []}`) and wrote two session transcripts. In one falsifier run Haiku ran `echo "Calling tool: mcp__market-watch__quote2"`, which the user's permission settings allowed.

## Status after fixes

Re-validated 2026-10-11 after the fix. **Mode for the fix sub-claims: single-context sequential fallback** (orchestrator), so these are "dual-confirmed (fallback mode)", not independently dual-confirmed.

| ID | Sub-claim | A (docs) | B (runtime) | Gate |
|---|---|---|---|---|
| C12.2a | An alert another session adds between the poller's read and its write is kept | DTS/UI: `$.store` is shared and get/set is not atomic, so a write must re-read to keep a concurrent change (mechanism cited by Channel A) | `hooks/alerts-concurrency.test.ts` test 1: **failed on old code** (`Received: undefined` for `a2`), **passes on fixed code** | **ACCEPTED (fallback)** |
| C12.2b | An alert another session removes in that window is not resurrected | same | test 2: **failed on old code** (resurrected `a1`), **passes on fixed code** | **ACCEPTED (fallback)** |
| C12.3 | No interleaving of two writers can lose or duplicate an alert change | UI: "A `get` followed by a `set` isn't atomic"; the API offers no compare-and-set on `$.store` | not provable by test; window narrowed to the two awaits between re-read and write | **UNRESOLVED — escalated** as a documented limitation (PRFAQ risk table) |
| C13.2 | Same as C12.2 for re-arm | same | same tests | **ACCEPTED (fallback)**, residual as C12.3 |
| C12–C17 regression | Channel B's original probes c12–c17 on the fixed code | — | all pass (`rc=0` each) | unchanged: **ACCEPTED** |

Deterministic gates after the fix: `claude plugin test .` → 24 pass / 0 fail; `claude plugin validate .` and `.claude-plugin/plugin.json` → passed; `tsc -p` (engine tsconfig) → exit 0.

Doc fixes applied for C03, C20, C22, C24, C27 (README, PRFAQ, docs/SUBMISSION.md, CHANGELOG 0.1.1).

### Final verdict

**PASS with one escalated limitation.** Every material claim is ACCEPTED except **C12.3** (atomicity of the shared alert store across sessions), which no test can prove and the platform API cannot guarantee. It is documented in the PRFAQ risk table and the changelog. Minor UNRESOLVED: C22.2 (headers the host adds on the wire), C23.2 (real wall-clock timeout). Minor REJECTED-and-fixed: C27.
