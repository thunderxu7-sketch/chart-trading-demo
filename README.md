# ARC · Next.js 14 RSC 合约交易 Demo

面向前端架构师面试的可运行 DEX 交易面板。保留原生 Next.js 14 App Router / RSC，采用 TradingView 官方开源 **Lightweight Charts**，不是需要授权包的 Advanced Charts。

默认模拟模式无需钱包。真实签名路径只连接本机 **Chain ID 31337**，调用随项目提供的测试兑换合约；行情、深度与代币均为演示数据，不是主网 DEX 或投资产品。未接入 TronWeb：EIP-6963 是 EVM 钱包发现协议，Tron 需要另一套适配。

## 快速运行

需要 Node.js 22、npm。所有命令在本项目目录执行。

```bash
npm ci
npm run dev
```

打开 [交易面板](http://127.0.0.1:3000/trade/eth-musd)。`dev` 同时启动 Next（3000）和合成行情 WebSocket（4001），Ctrl-C 会关闭两者。首页 `/`、交易对 `/markets/eth-musd`、FAQ `/faq` 均可直接访问。

可以立即体验：K 线 1m/5m/15m 切换、订单簿、精确金额与滑点输入、模拟买卖、静态模式和会话成交记录。模拟成交没有链上 hash，刷新页面会清空会话记录。

## 本地钱包与合约交易

终端 A 启动本地链，保持运行：

```bash
npm run chain
```

终端 B 部署和准备资产：

```bash
npm run contracts:deploy
# 使用自己的钱包公开地址；这里只向本地链账户分配无价值测试资产。
npm run fund -- 0x你的钱包地址
```

部署结果写入 `data/deployment.json`（已 gitignore）；RSC 从这里读取合约地址。不需要输入或保存钱包私钥。

然后启动或重启 `npm run dev`，连接支持 EIP-6963 的浏览器扩展钱包，选择“本地合约”，将钱包切到本地链。网络为 `http://127.0.0.1:8545`，Chain ID 为 `31337`。钱包拒绝添加 HTTP 本地网络时，需在该钱包中手动添加本地开发网络。

买入：mUSD（6 位）→ 演示 ETH ERC-20（18 位）；卖出方向相反。演示 ETH 不是原生 gas 资产。`fund` 同时准备原生测试 ETH 和两种 ERC-20。缺少 allowance 时先进行**本次数量的授权**，确认后再模拟、签名兑换，最后检查收据并刷新余额。

合约是固定价格教学实现：1 个演示 ETH = 2,845 mUSD，输入手续费 0.30%。图表和订单簿不参与合约定价或撮合。报价以合约读取结果为准；`minOut`、`deadline` 和整数精度参与执行检查。

## 验证与 CI

```bash
npx playwright install chromium
# 自动启动临时本地链、部署、测试、构建、启动服务、检查 SEO 和浏览器流程，结束后清理服务。
# 运行前先关闭自己已启动的 3000 / 4001 / 8545 服务；脚本不会杀死外部进程。
npm run verify
```

独立命令：

| 命令 | 检查内容 |
| --- | --- |
| `npm run typecheck` | TypeScript 边界与类型 |
| `npm run test:unit` | 金额／滑点、弱网策略、K 线聚合、行情校验、钱包宣告、RSC 边界 |
| `npm run test:contracts` | 需要已部署本地链；检查双向兑换余额差、授权、精度、过期、滑点与零输入 |
| `npm run build` | Next 14 生产构建；包含类型检查 |
| `npm start` | 启动已构建的 Next 与本地行情服务 |
| `npm run seo:check` | 服务运行时读取原始 HTML；检查 title、canonical、H1、Breadcrumb、摘要、robots、sitemap |
| `npm run test:e2e` | 需要已构建服务、行情和本地链；运行浏览器验收 |

GitHub Actions 入口：[`.github/workflows/ci.yml`](.github/workflows/ci.yml)。本地执行使用相同 `verify` 流程，远程运行结果以仓库 Actions 页面为准。浏览器签名测试使用注入的 **EIP-6963 测试 provider + 真实本地节点**，不是实际 MetaMask 扩展验收。

## 文件入口

| 阅读顺序 | 文件 | 要解释的边界 |
| --- | --- | --- |
| 1 | [`app/trade/[pair]/page.tsx`](app/trade/[pair]/page.tsx) | 交易页仍为 RSC；元信息／摘要／地址／费率在小岛外 |
| 2 | [`lib/server/market.ts`](lib/server/market.ts) | `server-only`、预取、DTO 校验、60 秒缓存策略 |
| 3 | [`components/trading/trading-desk.tsx`](components/trading/trading-desk.tsx) | 客户端工作区和仅图表叶子的 `ssr:false` |
| 4 | [`components/trading/use-market-feed.ts`](components/trading/use-market-feed.ts) | WebSocket 生命周期、乱序过滤、超时、重连与销毁 |
| 5 | [`lib/client/wallet-adapter.ts`](lib/client/wallet-adapter.ts) | EIP-6963 发现、去重、显式选择、不可信宣告 |
| 6 | [`lib/client/trade-executor.ts`](lib/client/trade-executor.ts) | 懒加载 ABI、链／账户复核、授权、模拟、收据、失败分类 |
| 7 | [`scripts/check-seo.ts`](scripts/check-seo.ts) | 直接检查原始 HTML，而非只检查水合后的 DOM |

面试讲解、架构图和 trade-off 见 [`ARCHITECTURE.md`](ARCHITECTURE.md)。代码中的 `Trade-off` 注释标注具体决定及风险。

## 配置与部署边界

`.env.example` 提供配置说明。Next 会读取 `.env.local`：

- `SITE_URL`：真实公开域名，用于 canonical、Open Graph、robots、sitemap 和 Breadcrumb。生产构建前设置；独立运行 SEO 脚本时也传入相同环境变量，例如 `SITE_URL=https://demo.example.com npm run seo:check`。
- `NEXT_PUBLIC_MARKET_WS_URL`：浏览器连接的行情源；本地默认 `ws://127.0.0.1:4001`。HTTPS 页面需要可访问的 `wss://` 地址。
- `MARKET_DATA_URL`：可选、仅服务端使用的快照 HTTP 地址，必须符合项目 DTO。默认使用可复现样本；失败时明确回退为合成演示快照。
- `NEXT_PUBLIC_LOCAL_RPC_URL`：默认 `http://127.0.0.1:8545`，执行器拒绝非 localhost/127.0.0.1 地址。交易能力有意限制为本地测试。

项目采用 Node 运行时和 ISR，不是 `output: export` 静态导出。当前交付为本地源码和演示，没有公网部署。若部署到支持 Next.js 14 的 Node 平台，公共介绍／FAQ／交易快照可以抓取；行情服务需单独部署并配置 TLS、来源限制及负载策略。本机钱包/RPC 的教学路径不能直接当作线上交易服务。

robots 和 sitemap 只是抓取配置。实际 Google 抓取还需要公网可达、无登录墙、正确域名与 HTTP 状态；不保证索引或排名。

按需求固定 **Next 14.2.35 / React 18.3.1**。截至本次实施，14.x 已列在官方 Unsupported Versions；生产升级需要单独规划，不能把“使用 14 的面试 Demo”视为当前生产选型建议。[Next.js 支持策略](https://nextjs.org/support-policy)

## 已知范围

- 合约是本地固定价格测试实现，非真实 AMM、订单簿撮合、价格预言机或已审计系统；测试 token 允许任意 mint。
- 行情为加速合成流，不回填断线期间历史。恢复显示最新帧；真实数据源还需要序列补偿、交易日历和背压设计。
- Network Information API 并非所有浏览器支持；省流／3G／高延迟会暂停，API 缺失时保留手动静态开关及连接失败降级。
- 单次确认适合自动出块本地链；生产必须按目标链设置确认与重组策略。
- 等待收据失败会保留 hash 并锁定本次会话的合约下单；跨刷新恢复、持久待确认交易、交易替换的完整 UX 属于后续生产工作。
- 自动化验证只使用本地测试账户和注入式测试钱包，未操作用户现有钱包或发送主网交易。

## Attribution

TradingView Lightweight Charts™ — Copyright (с) 2025 TradingView, Inc. [TradingView](https://www.tradingview.com/)。页面保留署名与链接，声明同时见 [`public/tradingview-notice.txt`](public/tradingview-notice.txt)。该库采用 Apache-2.0；许可证由依赖包提供。
