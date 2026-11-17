import type { Candle, Level, MarketSnapshot } from './types';

// Deterministic public fixture, never presented as actual DEX liquidity/history.
export function makeBook(price: number): { asks: Level[]; bids: Level[] } {
  return {
    asks: Array.from({ length: 9 }, (_, i) => ({ price: price + (9 - i) * .45, size: +(1.2 + ((i * 17) % 31) / 8).toFixed(3) })),
    bids: Array.from({ length: 9 }, (_, i) => ({ price: price - (i + 1) * .45, size: +(0.8 + ((i * 13) % 29) / 7).toFixed(3) }))
  };
}
export function makeSnapshot(): MarketSnapshot {
  const start = Date.parse('2026-11-17T00:00:00Z') / 1000;
  let previous = 2783;
  const candles: Candle[] = Array.from({ length: 96 }, (_, i) => {
    const open = previous;
    const close = +(open + Math.sin(i * 1.71) * 7 + Math.cos(i * .29) * 2.3 + .65).toFixed(2);
    previous = close;
    return { time: start + i * 60, open, close, high: Math.max(open, close) + 3.4, low: Math.min(open, close) - 2.8 };
  });
  const last = candles.at(-1)!.close;
  return {
    slug: 'eth-musd', symbol: 'ETH / mUSD', baseSymbol: 'ETH', quoteSymbol: 'mUSD',
    description: '在本地 EVM 测试链体验 ETH 与演示美元 mUSD 的合约兑换。行情、订单簿和代币均用于演示，不代表真实市场。',
    asOf: new Date(candles.at(-1)!.time * 1000).toISOString(),
    last, change: +((last / candles[0].open - 1) * 100).toFixed(2),
    high: Math.max(...candles.map(c => c.high)), low: Math.min(...candles.map(c => c.low)),
    volume: 1286400, feeBps: 30, candles, ...makeBook(last), deployment: null, source: 'synthetic-demo'
  };
}
