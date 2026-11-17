import type { Candle } from './types';
export function aggregateCandles(candles: Candle[], minutes: number): Candle[] {
  const result: Candle[] = [];
  for (const c of candles) {
    const time = Math.floor(c.time / (minutes * 60)) * minutes * 60;
    const previous = result.at(-1);
    if (previous?.time === time) { previous.high = Math.max(previous.high, c.high); previous.low = Math.min(previous.low, c.low); previous.close = c.close; }
    else result.push({ ...c, time });
  }
  return result;
}
