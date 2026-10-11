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
- Also once at each session start (and after a reload), and right after a `/watch` edit, whatever the time.
- Each open Claude Code session runs its own poller. Two sessions mean twice the requests, and an alert toasts in each session that sees it fire.
- The open/closed decision uses the session window Yahoo returns with each quote, so there is no timezone, DST or holiday calendar code to get wrong.

## Requirements

| | Minimum | Tested on |
|---|---|---|
| Claude Code in a terminal | v2.1.287 | 2.1.287 |
| Claude Code in the Desktop app (Code tab) | v2.1.286 | 2.1.293 |
| Network | HTTPS to `query1.finance.yahoo.com` | |
| `git` | Needed to add the marketplace from GitHub | |

Mods are on by default from those versions. No API key, no account, no environment variable.

> If you set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` during the mods early access, remove it. Claude Code v2.1.287 and later ignores it ([mods overview](https://code.claude.com/docs/en/plugins/mods/overview#turn-mods-on-or-off)).

Where the mod works: the terminal and the Desktop app's Code tab draw everything. In the VS Code extension's chat panel and in `claude -p`, the commands and the `quote` tool work, but nothing is drawn (no status line, pane or band).

## Quick start

```bash
claude plugin marketplace add rajib2k5/claude-market-watch
```

```bash
claude plugin install market-watch@claude-market-watch
```

Start `claude` (or run `/reload-plugins` in an open session), then run `/watch`. You should see:

```text
Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL
```

The [Deployment guide](#deployment-guide) covers team rollout, pinning, updates, releases, rollback and removal.

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
- Every `quote` tool result starts with the source and the fetch time. Every price line carries that symbol's as-of time, and a "market closed" flag after the close, so Claude does not present an old price as live. A symbol that fails gets an `ERROR` line with no price.

If the endpoint fails, the band shows the error (for example `⚠ AAPL: timed out after 8s`) and the ticker keeps the last good values.

## Deployment guide

**Tested** against this repository on Claude Code 2.1.287, in an isolated `CLAUDE_CONFIG_DIR`, with the output quoted as it appeared: marketplace add, install, `plugin list`, `claude -p "/watch"`, `plugin update`, `plugin uninstall`, `marketplace remove`, and `plugin tag --dry-run`.

**From Anthropic's docs, not yet run here:** project-scope and managed-settings rollout, container seeds, and the `/plugin` toggles. Links point to the source pages.

### 1. Install for yourself

**From a shell:**

```bash
claude plugin marketplace add rajib2k5/claude-market-watch
```

```bash
claude plugin install market-watch@claude-market-watch
```

Expected output:

```text
✔ Successfully added marketplace: claude-market-watch (declared in user settings)
✔ Successfully installed plugin: market-watch@claude-market-watch (scope: user)
```

**Or inside a session:**

```text
/plugin install market-watch --marketplace rajib2k5/claude-market-watch
```

Answer `y` to add the marketplace, then pick a scope.

The install id is always `market-watch@claude-market-watch`: the plugin name, `@`, the marketplace name from `.claude-plugin/marketplace.json` (not the repository name).

**Scopes** (`--scope`, default `user`):

| Scope | Loads in | Written to |
|---|---|---|
| `user` | Every session on your machine | `~/.claude/settings.json` |
| `project` | This repository, for everyone who trusts it | `.claude/settings.json` (commit it) |
| `local` | This repository, only for you | `.claude/settings.local.json` |

**No GitHub SSH key?** `claude plugin marketplace add` tries SSH first, then HTTPS. To skip the SSH probe, set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`.

### 2. Check that it is running

```bash
claude plugin list
```

```text
  ❯ market-watch@claude-market-watch
    Version: 0.1.0
    Scope: user
    Status: ✔ enabled
```

In a session:

- `/plugin` shows a dim line such as `1 mod active · market-watch`.
- `/watch` answers `Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL`.
- The status line fills with prices within a few seconds of the session starting.

Headless check, with no model call and no cost (the mod answers `/watch` itself):

```bash
claude -p "/watch"
```

```text
market-watch: Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL
```

`claude plugin details market-watch` reports `Hooks (0)`. That count is for settings hooks only; a mod's function hooks are listed by `claude plugin validate` instead.

### 3. Roll out to a team

**One repository.** In that repository, run once:

```bash
claude plugin marketplace add rajib2k5/claude-market-watch --scope project
```

```bash
claude plugin install market-watch@claude-market-watch --scope project
```

Commit the `.claude/settings.json` these write. Each contributor gets the mod after they accept the workspace trust dialog for the folder.

**A whole organization** (administrators). Put this in managed settings (server-managed settings, MDM, or `managed-settings.json`):

```json
{
  "extraKnownMarketplaces": {
    "claude-market-watch": {
      "source": { "source": "github", "repo": "rajib2k5/claude-market-watch" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "market-watch@claude-market-watch": true
  }
}
```

The marketplace key must equal the marketplace `name`, `claude-market-watch`. Managed `enabledPlugins` force-enables the mod; users cannot disable it at their own scope. See [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org). Review the mod first: `claude plugin validate` lists every hook and call ([What it hooks](#what-it-hooks-and-what-it-can-reach)).

**Containers and CI** that cannot clone at run time: build a seed with `CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin marketplace add …` and `… plugin install …`, then set `CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed` and `enabledPlugins` at run time. The mod draws nothing under `claude -p`, but the `quote` tool works there.

### 4. Pin a version

Each release is a git tag named `market-watch--v<version>`, created by step 6. The first is `market-watch--v0.1.0`. To hold a machine on one release, add the marketplace at that tag:

```bash
claude plugin marketplace add rajib2k5/claude-market-watch#market-watch--v0.1.0
```

To move to a newer release, remove the marketplace and add it again at the new tag.

### 5. Get updates

Claude Code gives you a new copy only when the `version` in `.claude-plugin/plugin.json` changes. Pushing commits without a version bump does nothing for installed users.

```bash
claude plugin update market-watch@claude-market-watch
```

```text
✔ market-watch is already at the latest version (0.1.0).
```

In a session, `/plugin marketplace update claude-market-watch` refreshes the catalog. To have updates arrive in the background, open `/plugin` → **Marketplaces** → `claude-market-watch` → **Enable auto-update** (it is off by default). After an update from the shell, run `/reload-plugins` in any open session.

### 6. Release a new version (maintainer)

1. **Gate.** All of these must pass:

   ```bash
   claude plugin test .
   ```

   ```bash
   claude plugin validate .
   ```

   ```bash
   claude plugin validate .claude-plugin/plugin.json
   ```

   ```bash
   npx -p typescript@5.6.3 tsc -p .
   ```

2. **Bump** `version` in `.claude-plugin/plugin.json` (semver: patch for fixes, minor for features, major for a breaking change to commands, the tool's input, or stored data). Set it in `plugin.json` only, never also in `marketplace.json`.
3. **Record** the change in `CHANGELOG.md`.
4. **Commit and push** to `main`.
5. **Tag** the release. Check first with `--dry-run`:

   ```bash
   claude plugin tag . --dry-run
   ```

   ```text
   ✔ Dry run — would create tag market-watch--v0.1.0 at HEAD
   ```

   Then create and push it:

   ```bash
   claude plugin tag . --push
   ```

6. **Smoke test the published copy** in a throwaway config, so your own settings are untouched:

   ```bash
   export CLAUDE_CONFIG_DIR="$(mktemp -d)"
   claude plugin marketplace add rajib2k5/claude-market-watch
   claude plugin install market-watch@claude-market-watch
   claude -p "/watch"
   unset CLAUDE_CONFIG_DIR
   ```

   The last command must print `market-watch: Watching: …`.

### 7. Roll back a bad release

Roll **forward**. Revert the bad commit, bump to a new patch version (for example `0.2.0` → `0.2.1`), and release it as in step 6. Users then get the fix through a normal update. Avoid reusing an old version string: Claude Code compares versions to decide whether to update, and a reused string confuses anyone who already pinned it.

A user who needs the old release immediately can pin to its tag, as in step 4.

Stored data (watchlist and alerts) is plain JSON. A release that changes its shape must read the old shape too. `loadWatchlist` and `loadAlerts` in `hooks/register.tsx` already fall back to defaults when the stored value is not what they expect.

### 8. Turn it off or remove it

| Goal | Do this |
|---|---|
| Hide just the band | `/market`, or the band's **Hide** button |
| Stop the mod, keep it installed | `/plugin` → **Installed** → disable `market-watch` |
| Run one session without any mods | `claude --safe-mode` |
| Uninstall | `claude plugin uninstall market-watch@claude-market-watch` (add `--keep-data` to keep the plugin's data directory for a later reinstall) |
| Remove the marketplace too | `claude plugin marketplace remove claude-market-watch` (this also uninstalls its plugins) |

### 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `/watch` is not a command | The mod did not load. Check `claude --version` (2.1.287+ in a terminal), run `/reload-plugins`, and check `/plugin` for the `mods active` line or an error. `claude --debug` logs why a hook was skipped. |
| `Plugin "market-watch" not found in marketplace` | You installed by the wrong id. Use `market-watch@claude-market-watch`. |
| Marketplace add fails on a git error | No SSH key for GitHub. Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and retry. |
| Status line shows `SPY …` and never fills | The first poll failed. The band shows the error after `⚠`. Check that `https://query1.finance.yahoo.com` is reachable from your machine. |
| Band says `Market closed`, prices do not move | Expected outside US regular hours. The mod then polls every 15 minutes. |
| An alert never fires | The symbol is not on the watchlist (`/watch add SYM`), or it already fired and is waiting to re-arm (`/alert` shows `fired, waiting to re-arm`). |
| A new release does not arrive | The maintainer did not bump `version`, or auto-update is off. Run `claude plugin update market-watch@claude-market-watch`. |
| `tsc` reports `TS2589` | You are type-checking with the generated `claude-code-mcp` types. Use this repository's `tsconfig.json`, which leaves them out. |

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

## Changelog and product notes

- [CHANGELOG.md](CHANGELOG.md): what changed in each release.
- [PRFAQ.md](PRFAQ.md): why this exists, alternatives considered, risks, and what is next.

## License

[MIT](LICENSE) © 2026 Rajib Bahar

Not affiliated with or endorsed by Anthropic or Yahoo.
