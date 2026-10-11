import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AlertRule, Quote } from '../types'
import {
  CONTEXT_SYMBOLS, DEFAULT_WATCHLIST, MAX_TOOL_SYMBOLS, RANGES, applyWatch, chartUrl, evaluateAlert,
  formatAlert, formatForModel, formatPct, formatPrice, formatTicker, isMarketOpen, normalizeSymbol,
  parseAlertArgs, parseChart, parseWatchArgs, sparkline, toolHeader,
} from './core'
import type { ParsedChart, Range } from './core'

const quotes = atom({ plugin: 'market-watch', key: 'quotes' } as const, {})
const focus = atom({ plugin: 'market-watch', key: 'focus' } as const, null)
const isBandHidden = atom({ plugin: 'market-watch', key: 'isBandHidden' } as const, false)
const lastError = atom({ plugin: 'market-watch', key: 'lastError' } as const, null)

const PANE = 'market-quote'
const TOOL = 'mcp__market-watch__quote'
const STORE_WATCHLIST = 'watchlist'
const STORE_ALERTS = 'alerts'

const OPEN_POLL_MS = 60_000
/** While closed, poll rarely: only to learn the next session's window. */
const CLOSED_POLL_MS = 15 * 60_000
const FETCH_TIMEOUT_MS = 8_000

type Engine = EngineInterface

async function loadWatchlist($: Engine): Promise<string[]> {
  const stored = await $.store.get(STORE_WATCHLIST)
  return Array.isArray(stored) ? stored.filter((s): s is string => typeof s === 'string') : [...DEFAULT_WATCHLIST]
}

async function loadAlerts($: Engine): Promise<AlertRule[]> {
  const stored = await $.store.get(STORE_ALERTS)
  return Array.isArray(stored) ? (stored as AlertRule[]) : []
}

/** One chart fetch with a timeout; never rejects, so one bad symbol cannot sink a poll. */
async function fetchChart($: Engine, symbol: string, range: Range = '1d'): Promise<ParsedChart> {
  let timer: { cancel: () => void } | undefined
  const timeout = new Promise<ParsedChart>(resolve => {
    timer = $.clock.after(FETCH_TIMEOUT_MS, () =>
      resolve({ isOk: false, error: `${symbol}: timed out after ${FETCH_TIMEOUT_MS / 1000}s` }))
  })
  const request = $.http
    .fetch(chartUrl(symbol, range), { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(res => parseChart(symbol, res.status, res.text))
    .catch((err: unknown): ParsedChart => ({ isOk: false, error: `${symbol}: ${String(err)}` }))
  try {
    return await Promise.race([request, timeout])
  } finally {
    timer?.cancel()
  }
}

// Module variables reset on hot reload; that only costs one early poll.
let lastPollMs = 0
let isPolling = false

async function poll($: Engine, isForced = false): Promise<void> {
  if (isPolling) return
  const now = await $.clock.now()
  const held = await read($, quotes)
  const watchlist = await loadWatchlist($)
  const symbols = [...watchlist, ...CONTEXT_SYMBOLS]
  const isMissing = symbols.some(s => held[s] === undefined)
  if (!isForced && !isMissing && !isMarketOpen(now, held) && now - lastPollMs < CLOSED_POLL_MS) return

  isPolling = true
  try {
    lastPollMs = now
    const fresh: Record<string, Quote> = {}
    const errors: string[] = []
    // Sequential on purpose: Yahoo has no batch endpoint for keyless use and
    // rate-limits bursts; ~8 calls a minute stays well clear of that.
    for (const symbol of symbols) {
      const parsed = await fetchChart($, symbol)
      if (parsed.isOk) fresh[symbol] = parsed.quote
      else errors.push(parsed.error)
    }
    await update($, quotes, prev => ({ ...prev, ...fresh }))
    await update($, lastError, () => (errors.length > 0 ? errors.join('; ') : null))
    $.ui.status(formatTicker(watchlist, { ...held, ...fresh }))
    await checkAlerts($, fresh)
  } finally {
    isPolling = false
  }
}

async function checkAlerts($: Engine, fresh: Readonly<Record<string, Quote>>): Promise<void> {
  const rules = await loadAlerts($)
  if (rules.length === 0) return
  const armedById = new Map<string, boolean>()
  const fires: string[] = []
  for (const rule of rules) {
    const q = fresh[rule.symbol]
    if (!q) continue
    const { isFired, isArmed } = evaluateAlert(rule, q.price)
    if (isFired) fires.push(`🔔 ${rule.symbol} ${rule.op} ${rule.level}: now ${formatPrice(q.price)}`)
    if (isArmed !== rule.isArmed) armedById.set(rule.id, isArmed)
  }
  if (armedById.size > 0) {
    // $.store is shared by every session on the machine and get/set is not atomic. Re-read
    // just before writing and apply only this poll's arm changes, by id, so an alert another
    // session added or removed meanwhile is neither dropped nor resurrected. This narrows
    // the race to the two awaits below; it cannot remove it.
    const latest = await loadAlerts($)
    await $.store.set(STORE_ALERTS, latest.map(r => (armedById.has(r.id) ? { ...r, isArmed: armedById.get(r.id)! } : r)))
  }
  for (const text of fires) $.ui.toast(text, { timeoutMs: 15_000 })
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'watch', description: 'Show or edit the market-watch ticker symbols', argumentHint: '[add|remove|set SYM…] | reset' })
    await $.command.register({ name: 'quote', description: 'Open a quote pane for a symbol', argumentHint: 'SYM' })
    await $.command.register({ name: 'alert', description: 'Set, list or clear price alerts', argumentHint: 'SYM > 260 | rm <id> | clear' })
    await $.command.register({ name: 'market', description: 'Show or hide the market-context band above the prompt' })
    await $.tool.register({
      name: 'quote',
      description:
        'Live-ish stock/ETF/index quotes from Yahoo Finance. Use instead of recalling prices from memory. ' +
        'Returns price, day change, optional period return over `range`, day range, volume, and an as-of timestamp. ' +
        `Up to ${MAX_TOOL_SYMBOLS} symbols per call. Index symbols use a caret (^VIX, ^GSPC).`,
      inputSchema: {
        type: 'object',
        properties: {
          symbols: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: MAX_TOOL_SYMBOLS },
          range: { type: 'string', enum: [...RANGES], description: 'Period for the return figure; default 1d' },
        },
        required: ['symbols'],
      },
      isDeferred: false,
    })
    $.clock.every(OPEN_POLL_MS, () => void poll($))
    void poll($)
    return next(e)
  })

  on('command.run', { command: 'watch' }, async ($, e) => {
    const cmd = parseWatchArgs(e.args)
    const current = await loadWatchlist($)
    if (cmd.kind === 'usage') return { text: cmd.message }
    if (cmd.kind === 'show') return { text: `Watching: ${current.join(', ')}` }
    const updated = applyWatch(current, cmd)
    await $.store.set(STORE_WATCHLIST, updated)
    $.ui.status(formatTicker(updated, await read($, quotes)))
    void poll($, true)
    const skipped = 'rejected' in cmd && cmd.rejected.length > 0 ? ` (ignored invalid: ${cmd.rejected.join(', ')})` : ''
    return { text: `Watching: ${updated.join(', ')}${skipped}` }
  })

  on('command.run', { command: 'quote' }, async ($, e) => {
    const symbol = normalizeSymbol(e.args)
    if (symbol === null) return { text: 'Usage: /quote SYM (e.g. /quote NVDA)' }
    const parsed = await fetchChart($, symbol)
    if (!parsed.isOk) return { text: `Could not load ${symbol}: ${parsed.error}` }
    await update($, quotes, prev => ({ ...prev, [symbol]: parsed.quote }))
    await update($, focus, () => symbol)
    await $.ui.open({ id: PANE, title: symbol })
    return { text: `${symbol} ${formatPrice(parsed.quote.price)} ${formatPct(parsed.quote.dayChangePct)}` }
  })

  on('command.run', { command: 'alert' }, async ($, e) => {
    const cmd = parseAlertArgs(e.args)
    const rules = await loadAlerts($)
    switch (cmd.kind) {
      case 'usage':
        return { text: cmd.message }
      case 'list':
        return { text: rules.length === 0 ? 'No alerts.' : rules.map(formatAlert).join('\n') }
      case 'clear':
        await $.store.set(STORE_ALERTS, [])
        return { text: `Cleared ${rules.length} alert(s).` }
      case 'remove': {
        const kept = rules.filter(r => r.id !== cmd.id)
        await $.store.set(STORE_ALERTS, kept)
        return { text: kept.length === rules.length ? `No alert ${cmd.id}.` : `Removed ${cmd.id}.` }
      }
      case 'add': {
        const nextId = 1 + Math.max(0, ...rules.map(r => Number(r.id.slice(1)) || 0))
        const rule: AlertRule = { id: `a${nextId}`, symbol: cmd.symbol, op: cmd.op, level: cmd.level, isArmed: true }
        await $.store.set(STORE_ALERTS, [...rules, rule])
        const watching = (await loadWatchlist($)).includes(cmd.symbol)
        const hint = watching ? '' : ` Note: ${cmd.symbol} is not on the watchlist, so it is not polled; /watch add ${cmd.symbol}.`
        return { text: `Added ${formatAlert(rule)}.${hint}` }
      }
    }
  })

  on('command.run', { command: 'market' }, async $ => {
    const isHidden = !(await read($, isBandHidden))
    await update($, isBandHidden, () => isHidden)
    return { text: isHidden ? 'Market band hidden.' : 'Market band shown.' }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as { symbols?: unknown; range?: unknown }
    const range: Range = RANGES.includes(input.range as Range) ? (input.range as Range) : '1d'
    const raw = Array.isArray(input.symbols) ? input.symbols.map(String) : []
    const symbols = [...new Set(raw.map(normalizeSymbol).filter((s): s is string => s !== null))].slice(0, MAX_TOOL_SYMBOLS)
    if (symbols.length === 0) return { deny: 'quote: give 1-8 ticker symbols, e.g. {"symbols": ["AAPL"]}' }

    const fetchedAtMs = await $.clock.now()
    // Parallel here (unlike the poller): the model is waiting, and 8 is the cap.
    const parsed = await Promise.all(symbols.map(s => fetchChart($, s, range)))
    const lines = parsed.map(p => (p.isOk ? formatForModel(p.quote, range, p.rangeBaseClose, fetchedAtMs) : `ERROR ${p.error}`))
    return { result: [toolHeader(fetchedAtMs), ...lines].join('\n') }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const symbol = await read($, focus)
    const q = symbol ? (await read($, quotes))[symbol] : undefined
    if (!q) return <Text dimColor>Run /quote SYM to load a symbol.</Text>
    const width = Math.max(10, (e.props.bodyColumns ?? 40) - 2)
    const lo = q.closes.length ? Math.min(...q.closes) : null
    const hi = q.closes.length ? Math.max(...q.closes) : null
    return (
      <Box flexDirection="column">
        <Text bold>{q.symbol} · {q.name}</Text>
        <Text>
          {formatPrice(q.price)} {q.currency} {formatPct(q.dayChangePct)}
        </Text>
        <Text>{sparkline(q.closes, width)}</Text>
        {lo !== null && hi !== null && <Text dimColor>chart low {formatPrice(lo)} · high {formatPrice(hi)}</Text>}
        {q.dayLow !== null && q.dayHigh !== null && (
          <Text dimColor>day range {formatPrice(q.dayLow)}–{formatPrice(q.dayHigh)}</Text>
        )}
        {q.volume !== null && <Text dimColor>volume {q.volume.toLocaleString('en-US')}</Text>}
        <Text dimColor>as of {new Date(q.asOfMs).toISOString().slice(0, 16).replace('T', ' ')} UTC</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isBandHidden))) return next(e)
    const held = await read($, quotes)
    const vix = held['^VIX']
    const tnx = held['^TNX']
    const error = await read($, lastError)
    if (!vix && !tnx && !error) return next(e)

    const now = await $.clock.now()
    const ages = Object.values(held).map(q => q.asOfMs)
    const newest = ages.length ? Math.max(...ages) : 0
    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor>
          {isMarketOpen(now, held) ? 'Market open' : 'Market closed'}
          {vix ? ` · VIX ${vix.price.toFixed(2)} ${formatPct(vix.dayChangePct)}` : ''}
          {tnx ? ` · 10Y ${tnx.price.toFixed(2)}%` : ''}
          {newest ? ` · last trade ${Math.max(0, Math.round((now - newest) / 60_000))}m ago` : ''}
          {error ? ` · ⚠ ${error.slice(0, 60)}` : ''}{' '}
        </Text>
        <Button key="hide" label="Hide" onPress={() => update($, isBandHidden, () => true)} />
      </Box>
    )
  })
}
