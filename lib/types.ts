export type Candle = { time: number; open: number; high: number; low: number; close: number };
export type Level = { price: number; size: number };
export type Deployment = { chainId: 31337; exchange: `0x${string}`; base: `0x${string}`; quote: `0x${string}` };
export type MarketSnapshot = {
  slug: string; symbol: string; baseSymbol: string; quoteSymbol: string;
  description: string; asOf: string; last: number; change: number;
  high: number; low: number; volume: number; feeBps: number;
  candles: Candle[]; asks: Level[]; bids: Level[];
  deployment: Deployment | null; source: 'synthetic-demo';
};
export type MarketFrame = { symbol: string; sequence: number; candle: Candle; asks: Level[]; bids: Level[] };
export interface Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}
export type WalletInfo = { uuid: string; name: string; rdns: string; icon: string };
export type WalletDetail = { info: WalletInfo; provider: Provider };
export type WalletSession = { detail: WalletDetail; account: `0x${string}`; chainId: number };
export type TradeProgress = { phase: string; hash?: string; error?: string };
