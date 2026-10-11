import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { AlertRule } from '../types'

const typed = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

const chart = (symbol: string, price: number) =>
  JSON.stringify({
    chart: {
      result: [{
        meta: {
          symbol, currency: 'USD', regularMarketPrice: price, regularMarketChangePercent: 1, regularMarketTime: 1791576000,
          currentTradingPeriod: { regular: { start: 1791552600, end: 1791576000 } },
        },
        indicators: { quote: [{ close: [price] }] },
      }],
      error: null,
    },
  })

/**
 * A store shared with "another session": the first time this session reads
 * `alerts`, the other session appends an alert right after the read, before
 * this session writes. That is the interleaving `$.store`'s docs warn about
 * ("A get followed by a set isn't atomic").
 */
function sharedStore(on: On, initial: Record<string, unknown>, concurrentAdd: AlertRule) {
  const data: Record<string, unknown> = { ...initial }
  let alertReads = 0
  on('store.get', (_$, e) => {
    const value = data[e.key]
    if (e.key === 'alerts' && ++alertReads === 1) {
      data.alerts = [...(data.alerts as AlertRule[]), concurrentAdd]
    }
    return { value: value === undefined ? undefined : JSON.parse(JSON.stringify(value)) }
  })
  on('store.set', (_$, e) => {
    data[e.key] = JSON.parse(JSON.stringify(e.value))
    return { value: undefined }
  })
  return data
}

test('an alert another session adds while this session evaluates alerts is not lost', async ($, on) => {
  const clock = mock.clock(on, { now: 1791560000_000 })
  const fired: AlertRule = { id: 'a1', symbol: 'SPY', op: '>', level: 100, isArmed: true }
  const added: AlertRule = { id: 'a2', symbol: 'SPY', op: '<', level: 50, isArmed: true }
  const data = sharedStore(on, { watchlist: ['SPY'], alerts: [fired] }, added)
  on('http.fetch', (_$, e) => {
    const symbol = decodeURIComponent(new URL(e.url).pathname.split('/').pop() ?? '')
    return { value: { status: 200, ok: true, headers: {}, text: chart(symbol, 110) } }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  await $.command.run({ ...typed, command: 'watch', args: 'add AAPL' })
  await clock.settle()

  const alerts = data.alerts as AlertRule[]
  expect(alerts.find(a => a.id === 'a2')).toEqual(added)
  expect(alerts.find(a => a.id === 'a1')?.isArmed).toBe(false)
})

test('an alert another session removed meanwhile is not resurrected', async ($, on) => {
  const clock = mock.clock(on, { now: 1791560000_000 })
  const a1: AlertRule = { id: 'a1', symbol: 'SPY', op: '>', level: 100, isArmed: true }
  const data: Record<string, unknown> = { watchlist: ['SPY'], alerts: [a1] }
  let alertReads = 0
  on('store.get', (_$, e) => {
    const value = data[e.key]
    // The other session clears every alert right after this session's first read.
    if (e.key === 'alerts' && ++alertReads === 1) data.alerts = []
    return { value: value === undefined ? undefined : JSON.parse(JSON.stringify(value)) }
  })
  on('store.set', (_$, e) => {
    data[e.key] = JSON.parse(JSON.stringify(e.value))
    return { value: undefined }
  })
  on('http.fetch', (_$, e) => {
    const symbol = decodeURIComponent(new URL(e.url).pathname.split('/').pop() ?? '')
    return { value: { status: 200, ok: true, headers: {}, text: chart(symbol, 110) } }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))

  await $.command.run({ ...typed, command: 'watch', args: 'add AAPL' })
  await clock.settle()

  expect(data.alerts).toEqual([])
})
