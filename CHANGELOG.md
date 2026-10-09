# Changelog

All notable changes to this mod. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-09

### Added
- Status-line ticker with a default watchlist of SPY, META, AAPL, AMZN, NFLX, GOOGL.
- `/watch` to show, add, remove, set or reset the watchlist, saved across sessions (12 symbols max).
- `/quote SYM` pane: price, day change, intraday sparkline, chart low/high, day range, volume, as-of time.
- `/alert` price alerts with fire-once and 0.5% re-arm hysteresis, shown as toasts.
- Market-context band above the prompt: open/closed, VIX, 10-year yield, data age, last error. `/market` toggles it.
- `quote` tool the model can call: up to 8 symbols, ranges `1d` to `1y`, with source, fetch time and as-of time on every result.
- Market-hours-aware polling from the exchange's own session window: 60 s while open, 15 min while closed.
