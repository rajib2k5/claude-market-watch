# Changelog

All notable changes to this mod. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-11-13

Changes for the Anthropic plugin directory's automatic policy check. No change to what the mod does.

### Changed
- The Yahoo request URL is now one fixed `https://query1.finance.yahoo.com/...` template at the single `$.http.fetch` call, with the options as an inline object. Removed `chartUrl` from `core.ts`; `intervalFor` gives the bar interval.
- The `tool.call` and pane matchers use the literal tool name and pane id instead of constants.
- Non-ASCII glyphs in code (arrows, dots, sparkline blocks, the bell) are written as `\u` escapes. Output is unchanged.
- README: new reviewer sections on what is fetched, from which host and what is sent, and on what the `command.run` and `tool.call` hooks do.
- `plugin.json`: removed `termsOfServiceUrl` (it pointed at the MIT license, which is not terms of service). `types` stays: it is a documented manifest field, and without it `claude plugin validate` 2.1.296 fails with four "is not declared" errors for the mod's state keys.

### Removed from the shipped plugin
- `docs/validation/` (the evidence-gated validation record) and `docs/SUBMISSION.md`. Both stay in git history at `765b8dc`.
- A duplicate copy of the plugin icon image under `docs/images/`.

### Added
- A test that every request goes to the one Yahoo host with only a `User-Agent` header, whatever extra fields a tool call carries.

## [0.1.1] - 2026-10-10

### Fixed
- Alerts are no longer lost or resurrected when two Claude Code sessions update them at the same time. The poller now re-reads the alert list just before writing and applies only its own arm/disarm changes, by id. `$.store` has no atomic update, so a narrow window remains; see `PRFAQ.md`.

### Changed
- Renamed the internal TypeScript type alias `$` to `Engine` so Anthropic's plugin-directory checker can follow the hooks module. Type-only: the compiled JavaScript is byte-identical (validated, EGV C01).
- Docs corrected where validation refuted the wording: as-of times are on every price line (not error lines), polling also happens at session start and after `/watch` edits, `isDeferred: false` needs Claude Code 2.1.293+, and the measured tool definition size is 584 characters.

### Added
- `PRIVACY.md`, a plugin icon image, screenshots and a how-to section in the README, and a README section for plugin-directory reviewers.
- Evidence-gated validation report (27 claims, two independent channels); moved out of the shipped plugin in 0.1.2.

## [0.1.0] - 2026-10-09

### Added
- Status-line ticker with a default watchlist of SPY, META, AAPL, AMZN, NFLX, GOOGL.
- `/watch` to show, add, remove, set or reset the watchlist, saved across sessions (12 symbols max).
- `/quote SYM` pane: price, day change, intraday sparkline, chart low/high, day range, volume, as-of time.
- `/alert` price alerts with fire-once and 0.5% re-arm hysteresis, shown as toasts.
- Market-context band above the prompt: open/closed, VIX, 10-year yield, data age, last error. `/market` toggles it.
- `quote` tool the model can call: up to 8 symbols, ranges `1d` to `1y`, with source, fetch time and as-of time on every result.
- Market-hours-aware polling from the exchange's own session window: 60 s while open, 15 min while closed.
