import type { MarketSnapshot } from '@/lib/types';
import { price } from '@/lib/money';
export function MarketSummary({ market }: { market: MarketSnapshot }) {
  return <section className="summary" aria-label="历史行情摘要" data-testid="server-summary">
    <div><span className="eyebrow">历史行情摘要 · 演示数据</span><h2>{market.symbol}</h2><p>快照时间 <time dateTime={market.asOf}>{market.asOf.replace('T',' ').replace('.000Z',' UTC')}</time></p></div>
    <dl className="metrics"><div><dt>快照价格</dt><dd>${price(market.last)}</dd></div><div><dt>区间涨跌</dt><dd className="positive">+{market.change}%</dd></div><div><dt>区间最高</dt><dd>{price(market.high)}</dd></div><div><dt>区间最低</dt><dd>{price(market.low)}</dd></div></dl>
  </section>;
}
