import { metadata as seo } from '@/lib/server/seo';
import { Breadcrumbs } from '@/components/breadcrumbs';
export const metadata = seo('交易常见问题', '了解 ARC 的测试资产、钱包连接、授权、滑点及弱网行情降级。', '/faq');
const questions = [
  ['这里会使用真实资金吗？', '不会。默认是无需签名的模拟交易；合约模式只支持本地 Chain ID 31337，使用无价值的演示 ERC-20。不要把真实资产转入任何演示地址。'],
  ['模拟交易和合约交易有什么区别？', '模拟模式仅记录本页会话中的演示成交，不会生成链上交易 hash。合约模式需要本地节点、已部署合约和钱包，经历授权、签名与收据确认。'],
  ['支持哪些钱包？', '支持通过 EIP-6963 宣告自身的 EVM 扩展钱包。点击连接后选择钱包，不自动连接，也不依赖 window.ethereum 抢占顺序。Tron 钱包不是 EIP-6963 协议的一部分。'],
  ['为什么图表暂停更新？', '省流模式、2G/3G、高延迟、离线或手动静态模式会暂停行情连接。浏览器不支持 Network Information API 时，仍可手动选择静态模式。恢复网络后可以恢复行情。'],
  ['为什么图表与最终兑换报价不同？', 'K 线和订单簿为合成行情，用于演示交互。测试兑换合约采用固定比率；执行前从合约读取报价，并按滑点计算最小收到数量。'],
  ['拿到 hash 就代表成交吗？', '不代表。hash 表示交易已提交；必须等待收据并检查执行状态。签名拒绝、模拟回滚、链上回滚和等待超时需要分别处理。'],
  ['页面没有 JavaScript 还能看到什么？', '首页、交易对介绍、FAQ、历史摘要、合约地址和费率都在初始 HTML 中。钱包、图表和订单操作需要客户端 JavaScript。']
];
export default function FAQ() { return <div className="page narrow"><Breadcrumbs items={[{ name: '首页', path: '/' }, { name: 'FAQ', path: '/faq' }]} /><section className="intro"><span className="eyebrow">GOOD TO KNOW</span><h1>交易前，你可能想知道。</h1><p>关于演示资产、钱包和交易流程的常见问题。</p></section><section className="faq-list">{questions.map(([q,a],i) => <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>)}</section></div>; }
