# Changelog

All notable changes to this mod. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-10-10

### Fixed
- Alerts are no longer lost or resurrected when two Claude Code sessions update them at the same time. The poller now re-reads the alert list just before writing and applies only its own arm/disarm changes, by id. `$.store` has no atomic update, so a narrow window remains; see `PRFAQ.md`.

### Changed
- Renamed the internal TypeScript type alias `$` to `Engine` so Anthropic's plugin-directory checker can follow the hooks module. Type-only: the compiled JavaScript is byte-identical (validated, EGV C01).
- Docs corrected where validation refuted the wording: as-of times are on every price line (not error lines), polling also happens at session start and after `/watch` edits, `isDeferred: false` needs Claude Code 2.1.293+, and the measured tool definition size is 584 characters.

### Added
- `PRIVACY.md`, a plugin icon (`.claude-plugin/icon.png`), screenshots and a how-to section in the README, and a README section for plugin-directory reviewers.
- Evidence-gated validation report in `docs/validation/egv-2026-10-10/` (27 claims, two independent channels).

## [0.1.0] - 2026-10-09

### Added
- Status-line ticker with a default watchlist of SPY, META, AAPL, AMZN, NFLX, GOOGL.
- `/watch` to show, add, remove, set or reset the watchlist, saved across sessions (12 symbols max).
- `/quote SYM` pane: price, day change, intraday sparkline, chart low/high, day range, volume, as-of time.
- `/alert` price alerts with fire-once and 0.5% re-arm hysteresis, shown as toasts.
- Market-context band above the prompt: open/closed, VIX, 10-year yield, data age, last error. `/market` toggles it.
- `quote` tool the model can call: up to 8 symbols, ranges `1d` to `1y`, with source, fetch time and as-of time on every result.
- Market-hours-aware polling from the exchange's own session window: 60 s while open, 15 min while closed.
