import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const TOOL = 'mcp__market-watch__quote'
/** What the engine stamps on a typed command; the plugin reads only `args`. */
const typed = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

const chart = (symbol: string, price: number, base: number) =>
  JSON.stringify({
    chart: {
      result: [{
        meta: {
          symbol, shortName: symbol, currency: 'USD', regularMarketPrice: price, chartPreviousClose: base,
          regularMarketChangePercent: 1.5, regularMarketTime: 1791576000,
          currentTradingPeriod: { regular: { start: 1791552600, end: 1791576000 } },
        },
        indicators: { quote: [{ close: [base, price] }] },
      }],
      error: null,
    },
  })

/** The world beneath the plugin: clock, store, network and the UI calls it makes. */
function world(on: On, fetched: string[]) {
  mock.clock(on, { now: 1791560000_000 })
  mock.store(on)
  on('http.fetch', (_$, e) => {
    fetched.push(e.url)
    const symbol = decodeURIComponent(new URL(e.url).pathname.split('/').pop() ?? '')
    if (symbol === 'ZZZZ') {
      return { value: { status: 404, ok: false, headers: {}, text: '{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found"}}}' } }
    }
    return { value: { status: 200, ok: true, headers: {}, text: chart(symbol, 110, 100) } }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
}

test('/watch shows SPY and FAANG by default', async ($, on) => {
  world(on, [])
  const out = await $.command.run({ ...typed, command: 'watch', args: '' })
  expect(out.text).toBe('Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL')
})

test('/watch edits persist and invalid symbols are reported, not stored', async ($, on) => {
  world(on, [])
  const added = await $.command.run({ ...typed, command: 'watch', args: 'add nvda b@d' })
  expect(added.text).toBe('Watching: SPY, META, AAPL, AMZN, NFLX, GOOGL, NVDA (ignored invalid: b@d)')
  await $.command.run({ ...typed, command: 'watch', args: 'remove meta nflx' })
  const shown = await $.command.run({ ...typed, command: 'watch', args: '' })
  expect(shown.text).toBe('Watching: SPY, AAPL, AMZN, GOOGL, NVDA')
})

test('quote tool returns period return, as-of time and per-symbol errors', async ($, on) => {
  const fetched: string[] = []
  world(on, fetched)
  const ran = await $.tool.call({ tool: TOOL, symbols: ['msft', 'zzzz', 'not a symbol'], range: '1mo' })
  expect(fetched.length).toBe(2)
  expect(fetched[0]).toContain('/chart/MSFT?range=1mo&interval=1d')
  const text = String(ran.result)
  expect(text).toContain('Source: Yahoo Finance')
  expect(text).toContain('MSFT (MSFT) | price 110 USD | day 1.50% | 1mo return 10.00% (from 100)')
  expect(text).toContain('as of 2026-')
  expect(text).toContain('ERROR ZZZZ: No data found')
})

test('quote tool refuses a call with no valid symbol', async ($, on) => {
  world(on, [])
  const ran = await $.tool.call({ tool: TOOL, symbols: ['!!'] })
  expect(ran.deny ?? ran.text).toContain('give 1-8 ticker symbols')
})
