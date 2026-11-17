import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarket } from '@/lib/server/market';
import { metadata } from '@/lib/server/seo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { MarketSummary } from '@/components/market-summary';
import { TradingDesk } from '@/components/trading/trading-desk';
export const revalidate = 60;
export function generateStaticParams() { return [{ pair: 'eth-musd' }]; }
export async function generateMetadata({ params }: { params: { pair: string } }) {
  const m = await getMarket(params.pair); if (!m) return {};
  return metadata(`${m.symbol} 合约交易面板`, '查看演示 K 线、订单簿与费率，连接 EIP-6963 钱包，在本地测试链执行合约交易。', `/trade/${m.slug}`);
}
export default async function TradePage({ params }: { params: { pair: string } }) {
  const m = await getMarket(params.pair); if (!m) notFound();
  // RSC boundary: pass only a small serializable public DTO. No provider, ABI,
  // account, signing state, or websocket is created here. RSC is not "no SSR".
  return <div className="page trading-page"><Breadcrumbs items={[{ name: '首页', path: '/' }, { name: m.symbol, path: `/markets/${m.slug}` }, { name: '交易', path: `/trade/${m.slug}` }]} />
    <div className="page-heading"><div><span className="eyebrow">SPOT / LOCAL EVM</span><h1><span className="token-icon">Ξ</span>{m.symbol}<span className="demo-tag">DEMO</span></h1></div><Link prefetch={false} href={`/markets/${m.slug}`}>交易对详情 ↗</Link></div>
    <TradingDesk market={m} />
    <MarketSummary market={m} />
    <section className="server-details" data-testid="server-details"><div><h2>公开交易信息</h2><p>{m.description}</p><p>费率：0.30% · 固定测试兑换比率：2,845 mUSD / ETH · Chain ID：31337</p></div><div><h2>本地 Exchange 合约</h2><code>{m.deployment?.exchange ?? '尚未部署 · 可先使用模拟模式'}</code><p>地址和费率由服务端提供；实际交易前重新校验链、合约与执行报价。</p></div></section>
    <noscript><p className="notice">钱包、图表和交易操作需要 JavaScript。历史摘要、合约信息和费率仍可阅读。</p></noscript></div>;
}
