import Link from 'next/link';
import { getMarket } from '@/lib/server/market';
import { metadata as seo } from '@/lib/server/seo';
import { MarketSummary } from '@/components/market-summary';
export const metadata = seo('链上交易，从清晰开始', 'ARC 是一个可运行的本地 DEX 交易演示，支持图表、订单簿、钱包连接与合约交互。', '/');
export const revalidate = 60;
export default async function Home() {
  const market = (await getMarket('eth-musd'))!;
  return <div className="page home"><section className="hero"><span className="eyebrow">ONCHAIN, IN FOCUS</span><h1>每一次交易，<br /><em>清晰可见。</em></h1><p>从行情到签名，从报价到确认。<br />在本地测试环境，体验完整的链上交易流程。</p><div className="hero-actions"><Link className="primary link-button" prefetch={false} href="/trade/eth-musd">进入交易面板 <span>↗</span></Link><Link className="secondary link-button" prefetch={false} href="/markets/eth-musd">了解交易对</Link></div><p className="small muted">默认模拟模式，无需安装钱包即可体验。</p></section>
    <MarketSummary market={market} /><section className="feature-grid"><article><span>01 / CHART</span><h2>看清市场</h2><p>TradingView Lightweight Charts K 线与合成订单簿，实时模式和静态摘要自由切换。</p></article><article><span>02 / CONTROL</span><h2>掌控每一步</h2><p>精确金额、滑点上限、明确授权。每笔测试交易都有可跟踪的状态。</p></article><article><span>03 / RESILIENCE</span><h2>弱网也从容</h2><p>网络受限时自动暂停行情流，保留可读的历史摘要和基本操作。</p></article></section></div>;
}
