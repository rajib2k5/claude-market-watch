/** One symbol's latest quote, as parsed from Yahoo's chart endpoint. */
export type Quote = {
  symbol: string
  name: string
  currency: string
  price: number
  /** Percent change vs the prior regular-session close (2.38 means +2.38%). */
  dayChangePct: number | null
  dayHigh: number | null
  dayLow: number | null
  volume: number | null
  /** Epoch ms of the last regular-market trade the price reflects. */
  asOfMs: number
  /** The exchange's regular session for the current day, epoch ms. */
  session: { startMs: number; endMs: number } | null
  /** Intraday closes, oldest first, nulls dropped. Drives the sparkline. */
  closes: number[]
}

/** A price alert. `isArmed` false means it fired and waits to re-arm. */
export type AlertRule = {
  id: string
  symbol: string
  op: '>' | '<'
  level: number
  isArmed: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'market-watch': {
      quotes: Record<string, Quote>
      /** The symbol the /quote pane shows. */
      focus: string | null
      isBandHidden: boolean
      /** The last poll failure, shown in the band; null after a clean poll. */
      lastError: string | null
    }
  }
}
