import type { Candle, Level, MarketFrame, MarketSnapshot } from './types';
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
function candle(v: unknown): v is Candle {
  if (!v || typeof v !== 'object') return false;
  const c = v as Candle;
  return Number.isSafeInteger(c.time) && c.time > 0 && [c.open,c.high,c.low,c.close].every(positive)
    && c.low <= Math.min(c.open,c.close) && c.high >= Math.max(c.open,c.close);
}
function levels(v: unknown): v is Level[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 20 && v.every(l => l && positive(l.price) && positive(l.size));
}
export function isFrame(v: unknown): v is MarketFrame {
  if (!v || typeof v !== 'object') return false;
  const f = v as MarketFrame;
  return f.symbol === 'ETH / mUSD' && Number.isSafeInteger(f.sequence) && f.sequence > 0
    && candle(f.candle) && levels(f.asks) && levels(f.bids);
}
export function isSnapshot(v: unknown): v is MarketSnapshot {
  if (!v || typeof v !== 'object') return false;
  const s = v as MarketSnapshot;
  return s.slug === 'eth-musd' && s.symbol === 'ETH / mUSD' && s.source === 'synthetic-demo'
    && s.baseSymbol === 'ETH' && s.quoteSymbol === 'mUSD' && typeof s.description === 'string'
    && Number.isFinite(Date.parse(s.asOf)) && [s.last,s.high,s.low,s.volume].every(positive)
    && Number.isFinite(s.change) && s.feeBps === 30 && levels(s.asks) && levels(s.bids)
    && Array.isArray(s.candles) && s.candles.length > 0 && s.candles.length <= 240
    && s.candles.every((c,i) => candle(c) && (i === 0 || c.time > s.candles[i-1].time));
}
