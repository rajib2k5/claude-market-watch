# Privacy policy — market-watch

*Effective 2026-10-10. Applies to the market-watch Claude Code mod in this repository.*

market-watch runs entirely on your machine, inside Claude Code. It has no server, no account, no analytics and no telemetry of its own. The author receives no data from it.

## What it stores

On your machine only, in the plugin's own storage that Claude Code keeps for it:

- your **watchlist** (the ticker symbols you choose);
- your **price alerts** (symbol, level, direction, and whether each one has fired).

Quotes it fetches are held in memory for the current session only. To remove everything it stored, uninstall the plugin (`claude plugin uninstall market-watch@claude-market-watch`) without `--keep-data`.

## What it sends, and where

The mod contacts one host: **`query1.finance.yahoo.com`**, Yahoo Finance's chart endpoint. Each request is an HTTPS `GET` for one symbol, in this form:

```text
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?range=<range>&interval=<interval>
```

The mod adds only the symbol, the range, the interval and a generic `User-Agent: Mozilla/5.0` header. It sends no credentials, API keys, environment variables, file contents, prompts or conversation text. Your watchlist and alerts are never sent anywhere; only the symbol being fetched appears in each request.

As with any HTTPS request, Yahoo can see your IP address and the request itself. Yahoo's handling of that data is covered by [Yahoo's privacy policy](https://legal.yahoo.com/us/en/yahoo/privacy/index.html).

## What it reads

- Its own stored watchlist and alerts.
- The quotes Yahoo returns.
- The arguments of its own four slash commands (`/watch`, `/quote`, `/alert`, `/market`) and of its own `quote` tool.

It does not read your files, your prompts, the transcript, other tools' calls, environment variables, or other plugins' data.

## Changes

Changes to this policy are recorded in this file's git history and in `CHANGELOG.md`.

## Contact

Open an issue at https://github.com/rajib2k5/claude-market-watch/issues.
