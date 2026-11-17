import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { makeSnapshot } from '../market-fixture';
import { isSnapshot } from '../market-validation';
import type { Deployment } from '../types';

// Trade-off: public metadata and bounded history belong on the server: HTML is
// crawlable even with JS disabled. ISR may be stale; this is NOT an executable
// quote. A wallet/provider/TronWeb must never enter this server-only module.
export const getMarket = cache(async (slug: string) => {
  if (slug !== 'eth-musd') return null;
  let snapshot = makeSnapshot();
  if (process.env.MARKET_DATA_URL) {
    try {
      const response = await fetch(process.env.MARKET_DATA_URL, { next: { revalidate: 60 }, signal: AbortSignal.timeout(2000) });
      if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
      const value: unknown = await response.json();
      if (!isSnapshot(value)) throw new Error('Invalid snapshot DTO');
      snapshot = { ...value, deployment: null }; // Remote price data cannot supply signing addresses.
    } catch {
      // Trade-off: keep a clearly labelled deterministic demo snapshot available
      // during upstream outages; never silently pretend it is a live quote.
      console.warn('Snapshot unavailable; using labelled demo fixture.');
    }
  }
  try {
    const value = JSON.parse(await readFile(path.join(process.cwd(), 'data/deployment.json'), 'utf8')) as Deployment;
    if (value.chainId === 31337 && [value.base,value.quote,value.exchange].every(a => /^0x[a-fA-F0-9]{40}$/.test(a))) snapshot.deployment = value;
  } catch { /* Fresh checkout: paper mode works before local contract deployment. */ }
  return snapshot;
});
