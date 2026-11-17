'use client';
import type { Level } from '@/lib/types';
import { price } from '@/lib/money';
export function OrderBook({ asks, bids, last, live }: { asks: Level[]; bids: Level[]; last: number; live: boolean }) {
  return <section className="order-book panel"><header className="panel-title"><h2>订单簿</h2><span className="muted">{live ? '合成行情' : '静态快照'}</span></header>
    <table><thead><tr><th>价格(mUSD)</th><th>数量(ETH)</th></tr></thead><tbody>{asks.map((l,i) => <tr key={`a-${i}`} className="ask" style={{ '--depth': `${l.size / 6 * 100}%` } as React.CSSProperties}><td>{price(l.price)}</td><td>{l.size.toFixed(3)}</td></tr>)}</tbody></table>
    <div className="mid-price">{price(last)} <span>↑</span><small>参考价格 · 非执行报价</small></div>
    <table aria-label="买盘"><tbody>{bids.map((l,i) => <tr key={`b-${i}`} className="bid" style={{ '--depth': `${l.size / 6 * 100}%` } as React.CSSProperties}><td>{price(l.price)}</td><td>{l.size.toFixed(3)}</td></tr>)}</tbody></table>
    <p className="small muted book-note">合成深度仅作展示，合约不按此订单簿撮合。</p></section>;
}
