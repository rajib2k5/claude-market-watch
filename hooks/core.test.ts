import { describe, expect, test } from 'claude-code/testing'

import type { AlertRule, Quote } from '../types'
import {
  DEFAULT_WATCHLIST, applyWatch, evaluateAlert, formatForModel, formatTicker, isMarketOpen,
  normalizeSymbol, parseAlertArgs, parseChart, parseWatchArgs, sparkline,
} from './core'

// Shape copied from a real 2026-10-09 response of
// /v8/finance/chart/MSFT?range=1mo&interval=1d, trimmed to the fields read.
const MSFT_1MO = JSON.stringify({
  chart: {
    result: [{
      meta: {
        symbol: 'MSFT', shortName: 'Microsoft Corporation', currency: 'USD',
        regularMarketPrice: 535.07, chartPreviousClose: 491.65, regularMarketChangePercent: 2.384,
        regularMarketDayHigh: 538.0, regularMarketDayLow: 529.5, regularMarketVolume: 21000000,
        regularMarketTime: 1791576000,
        currentTradingPeriod: { regular: { start: 1791552600, end: 1791576000 } },
      },
      indicators: { quote: [{ close: [492.44, null, 510.1, 535.07] }] },
    }],
    error: null,
  },
})
const NOT_FOUND = '{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found, symbol may be delisted"}}}'

const quote = (over: Partial<Quote> = {}): Quote => ({
  symbol: 'SPY', name: 'SPY', currency: 'USD', price: 100, dayChangePct: 0.5, dayHigh: 101, dayLow: 99,
  volume: 1, asOfMs: 0, session: { startMs: 1_000, endMs: 2_000 }, closes: [], ...over,
})

describe('parseChart', () => {
  test('reads price, day change, session window and drops null closes', () => {
    const parsed = parseChart('MSFT', 200, MSFT_1MO)
    if (!parsed.isOk) throw new Error(parsed.error)
    expect(parsed.quote.price).toBe(535.07)
    expect(parsed.quote.dayChangePct).toBe(2.384)
    expect(parsed.quote.session).toEqual({ startMs: 1791552600_000, endMs: 1791576000_000 })
    expect(parsed.quote.closes).toEqual([492.44, 510.1, 535.07])
    expect(parsed.rangeBaseClose).toBe(491.65)
  })

  test('surfaces Yahoo\'s own error for an unknown symbol on a 404', () => {
    expect(parseChart('ZZZZ', 404, NOT_FOUND)).toEqual({ isOk: false, error: 'ZZZZ: No data found, symbol may be delisted' })
  })

  test('an index has no currency and no volume', () => {
    const vix = JSON.stringify({ chart: { result: [{ meta: {
      symbol: '^VIX', currency: 'USD', instrumentType: 'INDEX', regularMarketPrice: 14.82, regularMarketVolume: 0,
    } }], error: null } })
    const parsed = parseChart('^VIX', 200, vix)
    if (!parsed.isOk) throw new Error(parsed.error)
    expect(parsed.quote.currency).toBe('')
    expect(parsed.quote.volume).toBe(null)
  })

  test('rejects a non-JSON body without throwing', () => {
    expect(parseChart('X', 429, 'Too Many Requests').isOk).toBe(false)
  })
})

describe('symbols and watchlist', () => {
  test('default watchlist is SPY plus the five FAANG names', () => {
    expect([...DEFAULT_WATCHLIST]).toEqual(['SPY', 'META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL'])
  })

  test('normalizes case and accepts indices, share classes, futures; rejects junk', () => {
    expect(normalizeSymbol(' aapl ')).toBe('AAPL')
    expect(normalizeSymbol('^vix')).toBe('^VIX')
    expect(normalizeSymbol('brk-b')).toBe('BRK-B')
    expect(normalizeSymbol('ES=F')).toBe('ES=F')
    expect(normalizeSymbol('')).toBe(null)
    expect(normalizeSymbol('../etc')).toBe(null)
    expect(normalizeSymbol('A B')).toBe(null)
  })

  test('add dedupes and keeps order, remove drops, set replaces, reset restores', () => {
    const base = ['SPY', 'AAPL']
    expect(applyWatch(base, parseWatchArgs('add nvda, aapl'))).toEqual(['SPY', 'AAPL', 'NVDA'])
    expect(applyWatch(base, parseWatchArgs('remove spy'))).toEqual(['AAPL'])
    expect(applyWatch(base, parseWatchArgs('set qqq iwm'))).toEqual(['QQQ', 'IWM'])
    expect(applyWatch(base, parseWatchArgs('reset'))).toEqual([...DEFAULT_WATCHLIST])
  })

  test('reports invalid symbols and refuses an edit with none valid', () => {
    expect(parseWatchArgs('add tsla b@d')).toEqual({ kind: 'add', symbols: ['TSLA'], rejected: ['b@d'] })
    expect(parseWatchArgs('add').kind).toBe('usage')
    expect(parseWatchArgs('frobnicate x').kind).toBe('usage')
    expect(parseWatchArgs('   ').kind).toBe('show')
  })
})

describe('display', () => {
  test('ticker shows arrows and a placeholder for a symbol not yet loaded', () => {
    const text = formatTicker(['SPY', 'AAPL'], { SPY: quote({ price: 571.2, dayChangePct: -0.2 }) })
    expect(text).toBe('SPY 571.20 ▼0.20% · AAPL …')
  })

  test('sparkline is width-bounded, flat input is a flat line, empty is empty', () => {
    expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8], 8)).toBe('▁▂▃▄▅▆▇█')
    expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4).length).toBe(4)
    expect(sparkline([5, 5, 5], 10)).toBe('▄▄▄')
    expect(sparkline([], 10)).toBe('')
  })

  test('market is open inside the session window plus the close grace, closed after', () => {
    const held = { SPY: quote() }
    expect(isMarketOpen(999, held)).toBe(false)
    expect(isMarketOpen(1_500, held)).toBe(true)
    expect(isMarketOpen(2_000 + 5 * 60_000, held)).toBe(true)
    expect(isMarketOpen(2_001 + 5 * 60_000, held)).toBe(false)
    expect(isMarketOpen(1_500, {})).toBe(false)
  })

  test('model text carries period return, as-of time, and flags a closed market', () => {
    const q = quote({ symbol: 'MSFT', name: 'Microsoft', price: 110, asOfMs: 2_000 })
    const text = formatForModel(q, '1mo', 100, 10 * 60_000)
    expect(text).toContain('1mo return 10.00% (from 100)')
    expect(text).toContain('as of 1970-01-01T00:00:02Z (market closed')
  })

  test('model text drops milliseconds and omits an empty currency', () => {
    const text = formatForModel(quote({ price: 14.82, currency: '', asOfMs: 2_807 }), '1d', null, 0)
    expect(text).toContain('price 14.82 |')
    expect(text).toContain('as of 1970-01-01T00:00:02Z')
  })
})

describe('alerts', () => {
  test('parses add, list, clear and rm; rejects malformed input', () => {
    expect(parseAlertArgs('tsla > 260')).toEqual({ kind: 'add', symbol: 'TSLA', op: '>', level: 260 })
    expect(parseAlertArgs('SPY<550.5')).toEqual({ kind: 'add', symbol: 'SPY', op: '<', level: 550.5 })
    expect(parseAlertArgs('')).toEqual({ kind: 'list' })
    expect(parseAlertArgs('clear')).toEqual({ kind: 'clear' })
    expect(parseAlertArgs('rm a3')).toEqual({ kind: 'remove', id: 'a3' })
    expect(parseAlertArgs('tsla >= 260').kind).toBe('usage')
    expect(parseAlertArgs('tsla > -5').kind).toBe('usage')
  })

  const above: AlertRule = { id: 'a1', symbol: 'X', op: '>', level: 100, isArmed: true }
  const below: AlertRule = { id: 'a2', symbol: 'X', op: '<', level: 100, isArmed: true }

  test('an armed rule fires on the crossing and disarms', () => {
    expect(evaluateAlert(above, 101)).toEqual({ isFired: true, isArmed: false })
    expect(evaluateAlert(below, 99)).toEqual({ isFired: true, isArmed: false })
  })

  test('an armed rule stays quiet and armed before the crossing', () => {
    expect(evaluateAlert(above, 99)).toEqual({ isFired: false, isArmed: true })
  })

  test('a fired rule does not fire again while price hovers near the level', () => {
    expect(evaluateAlert({ ...above, isArmed: false }, 100.2)).toEqual({ isFired: false, isArmed: false })
    expect(evaluateAlert({ ...above, isArmed: false }, 99.8)).toEqual({ isFired: false, isArmed: false })
  })

  test('a fired rule re-arms only after retreating past the 0.5% band', () => {
    expect(evaluateAlert({ ...above, isArmed: false }, 99.4)).toEqual({ isFired: false, isArmed: true })
    expect(evaluateAlert({ ...below, isArmed: false }, 100.6)).toEqual({ isFired: false, isArmed: true })
  })
})
