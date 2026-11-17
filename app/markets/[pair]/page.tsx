import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarket } from '@/lib/server/market';
import { metadata } from '@/lib/server/seo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { MarketSummary } from '@/components/market-summary';
export const revalidate = 60;
export function generateStaticParams() { return [{ pair: 'eth-musd' }]; }
export async function generateMetadata({ params }: { params: { pair: string } }) {
  const m = await getMarket(params.pair); if (!m) return {};
  return metadata(`${m.symbol} 交易对介绍`, m.description, `/markets/${m.slug}`);
}
export default async function MarketPage({ params }: { params: { pair: string } }) {
  const m = await getMarket(params.pair); if (!m) notFound();
  return <div className="page"><Breadcrumbs items={[{ name: '首页', path: '/' }, { name: m.symbol, path: `/markets/${m.slug}` }]} />
    <section className="intro"><span className="eyebrow">MARKET OVERVIEW</span><h1>{m.symbol}</h1><p>{m.description}</p><Link className="primary link-button" prefetch={false} href={`/trade/${m.slug}`}>开始交易 ↗</Link></section><MarketSummary market={m} />
    <section className="article"><h2>交易机制与费率</h2><p>本地合约使用固定兑换比率：1 个演示 ETH = 2,845 mUSD。输入金额先扣除 0.30% 手续费；mUSD 为 6 位精度，演示 ETH 代币为 18 位精度。图表报价仅用于交互演示，执行报价由合约读取。</p><h2>合约地址</h2><p>网络：本地 EVM，Chain ID 31337。演示 ETH 是测试 ERC-20，并非主网原生 ETH。</p><dl className="addresses"><dt>Exchange</dt><dd>{m.deployment?.exchange ?? '尚未部署本地合约'}</dd><dt>演示 ETH</dt><dd>{m.deployment?.base ?? '尚未部署'}</dd><dt>mUSD</dt><dd>{m.deployment?.quote ?? '尚未部署'}</dd></dl><h2>历史摘要</h2><p>上方摘要来自服务端预取的合成快照，即使关闭 JavaScript 也能阅读。所有历史数据均为固定测试样本，不是投资参考。</p></section></div>;
}
