'use client';
import { useEffect, useState } from 'react';
import type { MarketSnapshot } from '@/lib/types';
import { isFrame } from '@/lib/market-validation';
export function useMarketFeed(snapshot: MarketSnapshot, enabled: boolean, retry: number) {
  const [state,setState] = useState({ candles: snapshot.candles, asks: snapshot.asks, bids: snapshot.bids, status: 'static' });
  useEffect(() => {
    if (!enabled) { setState({ candles: snapshot.candles, asks: snapshot.asks, bids: snapshot.bids, status: 'static' }); return; }
    // Trade-off: WS belongs to this island, never an RSC request. Bound retries,
    // reject stale/malformed frames, and close on weak network, hide, or unmount.
    let disposed = false, socket: WebSocket | undefined, retries = 0, sequence = 0;
    let lastTime = snapshot.candles.at(-1)!.time, lastMessage = Date.now();
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setInterval> | undefined;
    const connect = () => {
      if (disposed) return;
      setState(s => ({ ...s, status: retries ? 'retrying' : 'connecting' }));
      try { socket = new WebSocket(process.env.NEXT_PUBLIC_MARKET_WS_URL || 'ws://127.0.0.1:4001'); }
      catch { setState(s => ({ ...s, status: 'stale' })); return; }
      lastMessage = Date.now();
      socket.onmessage = event => {
        if (disposed || typeof event.data !== 'string' || event.data.length > 32000) return;
        try {
          const frame: unknown = JSON.parse(event.data);
          if (!isFrame(frame) || frame.sequence <= sequence || frame.candle.time < lastTime) return;
          sequence = frame.sequence; lastTime = frame.candle.time; lastMessage = Date.now(); retries = 0;
          setState(s => ({ status: 'live', asks: frame.asks, bids: frame.bids,
            candles: [...s.candles.filter(c => c.time < frame.candle.time).slice(-239), frame.candle] }));
        } catch { /* Untrusted feed data is discarded, never rendered as HTML. */ }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (watchdog) clearInterval(watchdog);
        if (disposed) return;
        if (++retries > 3) { setState(s => ({ ...s, status: 'stale' })); return; }
        setState(s => ({ ...s, status: 'retrying' }));
        reconnect = setTimeout(connect, Math.min(500 * 2 ** retries, 4000));
      };
      watchdog = setInterval(() => { if (Date.now() - lastMessage > 10000) socket?.close(); }, 2000);
    };
    connect();
    return () => { disposed = true; clearTimeout(reconnect); clearInterval(watchdog); socket?.close(); };
  }, [snapshot, enabled, retry]);
  return state;
}
