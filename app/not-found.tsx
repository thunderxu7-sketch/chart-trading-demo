import Link from 'next/link';
export default function NotFound() { return <div className="page intro"><span className="eyebrow">404</span><h1>未找到这个交易对</h1><Link href="/trade/eth-musd">返回 ETH / mUSD</Link></div>; }
