// Pure core of market-watch: no `$`, no I/O, no clock. Everything here takes
// values and returns values so core.test.ts can pin it without mocks.

import type { AlertRule, Quote } from '../types'

export const DEFAULT_WATCHLIST: readonly string[] = ['SPY', 'META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL']
/** Shown in the band, not the ticker: volatility and the 10-year yield (in %). */
export const CONTEXT_SYMBOLS: readonly string[] = ['^VIX', '^TNX']
export const MAX_WATCHLIST = 12
export const MAX_TOOL_SYMBOLS = 8

export const SOURCE = 'Yahoo Finance chart API (unofficial, keyless)'

export const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', 'ytd', '1y'] as const
export type Range = (typeof RANGES)[number]
const INTERVAL_FOR: Record<Range, string> = {
  '1d': '5m', '5d': '30m', '1mo': '1d', '3mo': '1d', '6mo': '1d', 'ytd': '1d', '1y': '1d',
}

// Equities, ETFs, indices (^VIX), share classes (BRK.B, BRK-B), FX/futures (EURUSD=X, ES=F).
const SYMBOL_PATTERN = /^\^?[A-Z0-9][A-Z0-9.\-=]{0,14}$/

/** Upper-cases and validates one ticker; null when it cannot be a symbol. */
export function normalizeSymbol(raw: string): string | null {
  const symbol = raw.trim().toUpperCase()
  return SYMBOL_PATTERN.test(symbol) ? symbol : null
}

export function chartUrl(symbol: string, range: Range = '1d'): string {
  const query = `range=${range}&interval=${INTERVAL_FOR[range]}`
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`
}

export type ParsedChart =
  | { isOk: true; quote: Quote; rangeBaseClose: number | null }
  | { isOk: false; error: string }

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Parses a chart response body. Yahoo answers an unknown symbol with a 404
 * whose body still holds `chart.error`, so the body is read whatever the status.
 */
export function parseChart(symbol: string, status: number, body: string): ParsedChart {
  let json: any
  try {
    json = JSON.parse(body)
  } catch {
    return { isOk: false, error: `${symbol}: HTTP ${status}, body is not JSON` }
  }
  const apiError = json?.chart?.error
  if (apiError) return { isOk: false, error: `${symbol}: ${apiError.description ?? apiError.code ?? 'error'}` }
  const result = json?.chart?.result?.[0]
  const meta = result?.meta
  const price = num(meta?.regularMarketPrice)
  if (!meta || price === null) return { isOk: false, error: `${symbol}: HTTP ${status}, no price in response` }

  const regular = meta.currentTradingPeriod?.regular
  const startS = num(regular?.start)
  const endS = num(regular?.end)
  const rawCloses: unknown[] = result?.indicators?.quote?.[0]?.close ?? []

  // An index (^VIX, ^TNX) is a level, not a price: no currency, no traded volume.
  const isIndex = meta.instrumentType === 'INDEX'
  const quote: Quote = {
    symbol: String(meta.symbol ?? symbol),
    name: String(meta.shortName ?? meta.longName ?? symbol),
    currency: isIndex ? '' : String(meta.currency ?? ''),
    price,
    dayChangePct: num(meta.regularMarketChangePercent),
    dayHigh: num(meta.regularMarketDayHigh),
    dayLow: num(meta.regularMarketDayLow),
    volume: isIndex ? null : num(meta.regularMarketVolume),
    asOfMs: (num(meta.regularMarketTime) ?? 0) * 1000,
    session: startS !== null && endS !== null ? { startMs: startS * 1000, endMs: endS * 1000 } : null,
    closes: rawCloses.map(num).filter((v): v is number => v !== null),
  }
  // For range=1d this is yesterday's close; for longer ranges it is the close
  // before the range began, which is what a period return is measured from.
  return { isOk: true, quote, rangeBaseClose: num(meta.chartPreviousClose) }
}

const BLOCKS = '▁▂▃▄▅▆▇█'

/**
 * Min-max scaled sparkline, `width` glyphs wide. Min-max makes small moves
 * look large; that is deliberate for an intraday shape, and the pane prints
 * the real range beside it so the shape is never read as magnitude.
 */
export function sparkline(values: readonly number[], width: number): string {
  if (values.length === 0 || width < 1) return ''
  const buckets: number[] = []
  const per = values.length / Math.min(width, values.length)
  for (let i = 0; i < Math.min(width, values.length); i++) {
    const v = values[Math.min(values.length - 1, Math.floor((i + 1) * per) - 1)]
    if (v !== undefined) buckets.push(v)
  }
  const lo = Math.min(...buckets)
  const hi = Math.max(...buckets)
  if (hi === lo) return BLOCKS.charAt(3).repeat(buckets.length)
  return buckets.map(v => BLOCKS.charAt(Math.round(((v - lo) / (hi - lo)) * (BLOCKS.length - 1)))).join('')
}

export function formatPct(pct: number | null): string {
  if (pct === null) return '—'
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '·'
  return `${arrow}${Math.abs(pct).toFixed(2)}%`
}

export function formatPrice(price: number): string {
  return price >= 1000 ? price.toFixed(0) : price.toFixed(2)
}

/** The status-line text: `SPY 571.20 ▲0.80% · AAPL …`; missing symbols show `…`. */
export function formatTicker(list: readonly string[], quotes: Readonly<Record<string, Quote>>): string {
  return list
    .map(symbol => {
      const q = quotes[symbol]
      return q ? `${symbol} ${formatPrice(q.price)} ${formatPct(q.dayChangePct)}` : `${symbol} …`
    })
    .join(' · ')
}

/** Grace after the close so the closing print is captured before going idle. */
export const CLOSE_GRACE_MS = 5 * 60_000

/**
 * True while any held quote's exchange session contains `nowMs`. Uses the
 * exchange's own window from the response, so DST and holidays need no code
 * here: on a holiday Yahoo's window is the last session's, which is in the past.
 */
export function isMarketOpen(nowMs: number, quotes: Readonly<Record<string, Quote>>): boolean {
  return Object.values(quotes).some(
    q => q.session !== null && nowMs >= q.session.startMs && nowMs <= q.session.endMs + CLOSE_GRACE_MS,
  )
}

export type WatchCommand =
  | { kind: 'show' }
  | { kind: 'reset' }
  | { kind: 'add' | 'remove' | 'set'; symbols: string[]; rejected: string[] }
  | { kind: 'usage'; message: string }

const WATCH_USAGE = 'Usage: /watch [add|remove|set] SYM… | /watch reset'

export function parseWatchArgs(args: string): WatchCommand {
  const [verb = '', ...rest] = args.trim().split(/[\s,]+/).filter(Boolean)
  const v = verb.toLowerCase()
  if (v === '') return { kind: 'show' }
  if (v === 'reset') return { kind: 'reset' }
  if (v !== 'add' && v !== 'remove' && v !== 'set') return { kind: 'usage', message: WATCH_USAGE }
  const symbols: string[] = []
  const rejected: string[] = []
  for (const raw of rest) {
    const s = normalizeSymbol(raw)
    if (s === null) rejected.push(raw)
    else if (!symbols.includes(s)) symbols.push(s)
  }
  if (symbols.length === 0) return { kind: 'usage', message: `${WATCH_USAGE} (no valid symbols given)` }
  return { kind: v, symbols, rejected }
}

/** Applies a parsed edit; the list keeps insertion order and is capped. */
export function applyWatch(current: readonly string[], cmd: WatchCommand): string[] {
  switch (cmd.kind) {
    case 'reset': return [...DEFAULT_WATCHLIST]
    case 'set': return cmd.symbols.slice(0, MAX_WATCHLIST)
    case 'add': return [...current, ...cmd.symbols.filter(s => !current.includes(s))].slice(0, MAX_WATCHLIST)
    case 'remove': return current.filter(s => !cmd.symbols.includes(s))
    default: return [...current]
  }
}

export type AlertCommand =
  | { kind: 'list' }
  | { kind: 'clear' }
  | { kind: 'remove'; id: string }
  | { kind: 'add'; symbol: string; op: '>' | '<'; level: number }
  | { kind: 'usage'; message: string }

const ALERT_USAGE = 'Usage: /alert SYM > 260 | /alert SYM < 250 | /alert rm <id> | /alert clear | /alert'

export function parseAlertArgs(args: string): AlertCommand {
  const text = args.trim()
  if (text === '') return { kind: 'list' }
  if (/^clear$/i.test(text)) return { kind: 'clear' }
  const rm = /^(?:rm|remove)\s+(\S+)$/i.exec(text)
  if (rm?.[1]) return { kind: 'remove', id: rm[1] }
  const m = /^(\S+)\s*([<>])\s*(\d+(?:\.\d+)?)$/.exec(text)
  const [, rawSymbol, op, rawLevel] = m ?? []
  if (!rawSymbol || !op || !rawLevel) return { kind: 'usage', message: ALERT_USAGE }
  const symbol = normalizeSymbol(rawSymbol)
  const level = Number(rawLevel)
  if (symbol === null || !(level > 0)) return { kind: 'usage', message: ALERT_USAGE }
  return { kind: 'add', symbol, op: op as '>' | '<', level }
}

/** How far price must retreat past the level, as a fraction, before re-arming. */
export const REARM_FRACTION = 0.005

/**
 * Decides whether `rule` fires at `price`, and whether it is armed afterwards.
 *
 * Called once per poll per rule. Without hysteresis, a price hovering around
 * the level fires on every poll; the rule must fire on the crossing, then stay
 * quiet until the price has moved back past the level by REARM_FRACTION.
 *
 * Examples for { op: '>', level: 100 }:
 *   armed,    price 101   -> fires, now disarmed
 *   disarmed, price 100.2 -> quiet, stays disarmed (still within the band)
 *   disarmed, price 99.4  -> quiet, re-armed (retreated more than 0.5%)
 */
export function evaluateAlert(rule: AlertRule, price: number): { isFired: boolean; isArmed: boolean } {
  const isPast = rule.op === '>' ? price > rule.level : price < rule.level
  if (rule.isArmed) return { isFired: isPast, isArmed: !isPast }
  // Disarmed: re-arm only once price has retreated through the band on the far side.
  const hasRetreated = rule.op === '>'
    ? price < rule.level * (1 - REARM_FRACTION)
    : price > rule.level * (1 + REARM_FRACTION)
  return { isFired: false, isArmed: hasRetreated }
}

export function formatAlert(rule: AlertRule): string {
  return `${rule.id}  ${rule.symbol} ${rule.op} ${rule.level}${rule.isArmed ? '' : '  (fired, waiting to re-arm)'}`
}

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * The text the model reads from the quote tool. Every line carries the as-of
 * time and the source, so a stale or after-hours price is never presented as live.
 */
export function formatForModel(
  quote: Quote,
  range: Range,
  rangeBaseClose: number | null,
  fetchedAtMs: number,
): string {
  const parts = [
    `${quote.symbol} (${quote.name})`,
    `price ${quote.price}${quote.currency ? ` ${quote.currency}` : ''}`,
    `day ${quote.dayChangePct === null ? 'n/a' : `${quote.dayChangePct.toFixed(2)}%`}`,
  ]
  if (range !== '1d') {
    parts.push(
      rangeBaseClose === null
        ? `${range} return n/a`
        : `${range} return ${((quote.price / rangeBaseClose - 1) * 100).toFixed(2)}% (from ${rangeBaseClose})`,
    )
  }
  if (quote.dayLow !== null && quote.dayHigh !== null) parts.push(`day range ${quote.dayLow}–${quote.dayHigh}`)
  if (quote.volume !== null) parts.push(`volume ${quote.volume}`)
  const isClosed = quote.session !== null && fetchedAtMs > quote.session.endMs + CLOSE_GRACE_MS
  parts.push(`as of ${iso(quote.asOfMs)}${isClosed ? ' (market closed; last regular-session price)' : ''}`)
  return parts.join(' | ')
}

export function toolHeader(fetchedAtMs: number): string {
  return `Source: ${SOURCE}. Fetched ${iso(fetchedAtMs)}. Prices may be delayed; not investment advice.`
}
