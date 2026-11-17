# 本地验证记录

日期：2026-11-17（北京时间）。验证命令：`npm run verify`，最终完整执行返回 exit code 0。

环境：macOS arm64、Node.js 22；Next 14.2.35、React 18.3.1、Lightweight Charts 5.3.0、viem 2.57.20、Hardhat 2.29.2、Playwright 1.65.1。精确依赖锁定在 package-lock.json。

## 已通过

- 7 个单元测试：6/18 位精度、超出 Number 安全范围的金额、滑点边界与舍入、网络策略、OHLC 聚合、行情 DTO 与钱包宣告验证、RSC 模块边界。
- 本地合约集成：实际部署、双向 swap、余额变化、精确 allowance 消耗、缺少授权、minOut 不满足、过期 deadline、零输入回滚。
- Next 生产构建与 TypeScript 检查。
- 4 个页面的原始 HTML SEO 检查：title、canonical、H1、可索引设置；介绍／交易／FAQ 页的 Breadcrumb；交易页可抓取摘要与费率；robots 和 sitemap。
- 8 个 Chromium 浏览器流程：无 JavaScript 阅读、实时 K 线与模拟买卖、弱网阻止连接和恢复／省流断流、API 缺失的手动降级与移动端布局、EIP-6963 多钱包选择／懒加载／错误链／真实本地授权与兑换、拒签不产生假成交、账户变更与卸载断流、成交成功后余额 RPC 故障不覆盖成功状态。
- 图表画布边界检查：表格样式不污染 Lightweight Charts 内部布局，右侧价格轴完整显示。

## 构建观察

Next 输出：交易路由自身约 8.33 kB、First Load JS 约 105 kB；首页／介绍／FAQ First Load JS 约 96.4 kB。仅为本次构建的 Next 汇总口径，不代表总下载量、Lighthouse 分数或真实用户性能。图表、钱包和 ABI 的后续加载另外计算。

浏览器测试通过实际已下载 JS 的内容验证：钱包 adapter 在连接意图出现后加载；swap ABI 在执行合约操作时才加载。

截图为实际运行页面：

- [桌面交易面板](docs/trading-desktop.png)，1440 px 宽，完整页面。
- [移动端静态模式](docs/trading-mobile-static.png)，390 px 宽，完整页面。

## 验证范围限制

本地 provider 是测试注入实现，实际交易在临时本地 EVM 执行，没有操作用户现有钱包。未运行真实 MetaMask 等扩展兼容矩阵、主网交易、公开 Google 抓取、远程 GitHub Actions 或生产负载测试；没有完成合约审计。Next 14 的官方支持状态和生产化限制见 README 与 ARCHITECTURE。

验证结束后已停止本次创建的 Next、WebSocket 与本地链进程。使用 README 中的命令重新启动。
