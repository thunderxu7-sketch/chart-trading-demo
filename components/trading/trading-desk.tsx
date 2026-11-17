'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { MarketSnapshot } from '@/lib/types';
import { price } from '@/lib/money';
import { useNetwork } from './use-network';
import { useMarketFeed } from './use-market-feed';
import { OrderBook } from './order-book';
import { TradeForm } from './trade-form';
function ChartSkeleton({ paused = false }: { paused?: boolean }) { return <div className={`chart-skeleton ${paused ? 'paused' : ''}`} data-testid="chart-skeleton"><div className="skeleton-bars" aria-hidden="true">{[28,46,35,64,55,72,58,79,70,87,74,94].map((h,i) => <i key={i} style={{ height: `${h}%` }} />)}</div><p>{paused ? '实时图表已暂停 · 下方保留历史摘要' : '正在加载图表…'}</p></div>; }
// Trade-off: only the browser-dependent chart leaf uses ssr:false. The form and
// order book keep SSR HTML; the route, metadata and public summary remain RSC.
const Chart = dynamic(() => import('./chart'), { ssr: false, loading: () => <ChartSkeleton /> });
export function TradingDesk({ market }: { market: MarketSnapshot }) {
  const [manual,setManual] = useState(false), [retry,setRetry] = useState(0), [interval,setInterval] = useState(1);
  const [fills,setFills] = useState<{ id: string; side: string; amount: string; mode: string; hash?: string }[]>([]);
  const network = useNetwork(manual), enabled = network.ready && !network.paused;
  const feed = useMarketFeed(market,enabled,retry);
  const live = enabled && feed.status === 'live', last = feed.candles.at(-1)!.close;
  return <div className="trading-island"><div className="connection-bar"><span className={`feed-status ${live ? 'positive' : 'muted'}`} data-testid="feed-status"><i />{!enabled ? network.reason : feed.status === 'live' ? '合成行情流已连接 · 加速演示' : feed.status === 'stale' ? '行情暂不可用 · 静态快照' : '行情连接中 / 重试中'}{enabled && network.reason.includes('不可用') && <span className="muted"> · 不支持自动弱网检测</span>}</span><div><label className="toggle"><input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} />静态模式</label>{enabled && feed.status === 'stale' && <button className="text-button" onClick={() => setRetry(n => n + 1)}>重新连接</button>}</div></div>
    <div className="trading-grid"><section className="chart-panel panel"><div className="chart-heading"><div><span className="eyebrow">ETH / mUSD</span><strong>{price(enabled ? last : market.last)}<small>mUSD</small></strong></div><span className="demo-tag">合成行情</span></div><div className="chart-toolbar"><div className="intervals" aria-label="K 线周期">{[1,5,15].map(m => <button key={m} aria-pressed={interval === m} className={interval === m ? 'selected' : ''} onClick={() => setInterval(m)}>{m}m</button>)}</div><span>蜡烛图 · UTC</span></div>
      {enabled && feed.status !== 'stale' ? <Chart candles={feed.candles} interval={interval} /> : <ChartSkeleton paused={network.ready} />}
      <div className="chart-attribution"><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™ ↗</a><a href="/tradingview-notice.txt" target="_blank" rel="noreferrer">Copyright (с) 2025 TradingView, Inc.</a></div></section>
      <OrderBook asks={enabled ? feed.asks : market.asks} bids={enabled ? feed.bids : market.bids} last={enabled ? last : market.last} live={live} />
      <TradeForm market={market} onFill={fill => setFills(items => [fill,...items].slice(0,20))} /></div>
    <section className="fills panel"><header className="panel-title"><h2>本次会话成交</h2><span className="muted">{fills.length} 笔</span></header>{fills.length ? <table><thead><tr><th>方向</th><th>收到数量</th><th>模式</th><th>记录</th></tr></thead><tbody>{fills.map(f => <tr key={f.id}><td className={f.side === '买入' ? 'positive' : 'negative'}>{f.side}</td><td>{f.amount} {f.side === '买入' ? 'ETH' : 'mUSD'}</td><td>{f.mode}</td><td>{f.hash ? <code title={f.hash}>{f.hash.slice(0,10)}…{f.hash.slice(-6)}</code> : '模拟成交 · 无链上 hash'}</td></tr>)}</tbody></table> : <div className="empty-state"><span>↗</span><p>还没有成交记录<small>完成一笔模拟或本地合约交易后，会显示在这里。</small></p></div>}</section>
  </div>;
}
