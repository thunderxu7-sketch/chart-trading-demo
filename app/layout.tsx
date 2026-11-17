import type { Metadata } from 'next';
import Link from 'next/link';
import { origin } from '@/lib/server/seo';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(origin), title: { default: 'ARC Exchange', template: '%s | ARC Exchange' },
  robots: { index: true, follow: true }
};
// RSC shell; no global client wallet provider. Public pages ship no wallet/chart code.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><a className="skip" href="#main">跳转到正文</a>
    <header className="site-header"><Link href="/" className="brand" prefetch={false}><span className="brand-mark">A</span>ARC<span className="brand-sub">EXCHANGE</span></Link>
      <nav aria-label="主导航"><Link prefetch={false} href="/trade/eth-musd">交易</Link><Link prefetch={false} href="/markets/eth-musd">交易对</Link><Link prefetch={false} href="/faq">FAQ</Link></nav><span className="network-pill"><i />LOCAL TESTNET</span></header>
    <main id="main">{children}</main><footer><span>ARC Exchange · 交互与合约交易演示</span><span>仅测试资产 · 行情为合成数据 · 无真实资金</span></footer></body></html>;
}
