import { createPublicClient, createWalletClient, custom, http, type EIP1193Provider, type Hash } from 'viem';
import { hardhat } from 'viem/chains';
import type { Deployment, TradeProgress, WalletSession } from '../types';
import { minimumOut } from '../money';
export class PendingConfirmation extends Error { constructor(public hash: Hash) { super('暂时无法确认链上结果，请按 hash 核查，勿重复提交。'); } }
export async function executeTrade({ session, deployment, buy, amount, bps, onProgress }: {
  session: WalletSession; deployment: Deployment; buy: boolean; amount: bigint; bps: bigint; onProgress: (p: TradeProgress) => void;
}) {
  const rpc = process.env.NEXT_PUBLIC_LOCAL_RPC_URL || 'http://127.0.0.1:8545';
  const url = new URL(rpc);
  if (!['localhost','127.0.0.1'].includes(url.hostname) || !['http:','https:'].includes(url.protocol)) throw new Error('演示只支持本地 RPC');
  const client = createPublicClient({ chain: hardhat, transport: http(rpc, { timeout: 10000, retryCount: 1 }) });
  const wallet = createWalletClient({ account: session.account, chain: hardhat, transport: custom(session.detail.provider as EIP1193Provider) });
  const assertSession = async () => {
    const [chain, accounts, rpcChain] = await Promise.all([
      session.detail.provider.request({ method: 'eth_chainId' }), session.detail.provider.request({ method: 'eth_accounts' }), client.getChainId()
    ]);
    if (Number(chain) !== 31337 || rpcChain !== 31337 || deployment.chainId !== 31337) throw new Error('仅允许本地测试网络 31337');
    if (!Array.isArray(accounts) || String(accounts[0]).toLowerCase() !== session.account.toLowerCase()) throw new Error('账户已变更，请重新检查订单');
  };
  const confirm = async (hash: Hash, phase: string) => {
    onProgress({ phase, hash });
    let equivalent = true, knownHash = hash;
    let receipt;
    try { receipt = await client.waitForTransactionReceipt({ hash, timeout: 60000, confirmations: 1,
      onReplaced: replacement => {
        // Repricing preserves intent; cancellation or changed calldata must NOT
        // be mistaken for a successful swap just because its receipt succeeded.
        knownHash = replacement.transactionReceipt.transactionHash;
        if (replacement.reason !== 'repriced') equivalent = false;
        onProgress({ phase, hash: knownHash });
      }
    }); }
    catch { throw new PendingConfirmation(knownHash); }
    if (!equivalent) throw new Error('原交易已取消或被不同交易替换，不记为成交');
    if (receipt.status !== 'success') throw new Error('交易已上链但执行回滚');
    return receipt;
  };
  onProgress({ phase: '校验链与合约' }); await assertSession();
  const { tokenAbi, exchangeAbi } = await import('@/contracts/abi');
  if (!await client.getBytecode({ address: deployment.exchange })) throw new Error('本地合约不存在，请先部署');
  const [base, quoteToken] = await Promise.all([
    client.readContract({ address: deployment.exchange, abi: exchangeAbi, functionName: 'base' }),
    client.readContract({ address: deployment.exchange, abi: exchangeAbi, functionName: 'quoteToken' })
  ]);
  if (base.toLowerCase() !== deployment.base.toLowerCase() || quoteToken.toLowerCase() !== deployment.quote.toLowerCase()) throw new Error('部署配置与合约不一致');
  const input = buy ? deployment.quote : deployment.base;
  const [balance, allowance, decimals] = await Promise.all([
    client.readContract({ address: input, abi: tokenAbi, functionName: 'balanceOf', args: [session.account] }),
    client.readContract({ address: input, abi: tokenAbi, functionName: 'allowance', args: [session.account, deployment.exchange] }),
    client.readContract({ address: input, abi: tokenAbi, functionName: 'decimals' })
  ]);
  if (decimals !== (buy ? 6 : 18)) throw new Error('代币精度不符');
  if (amount <= 0n || balance < amount) throw new Error('测试代币余额不足，请先为本地账户领取测试资产');
  if (allowance < amount) {
    // Trade-off: exact approval costs an extra transaction, but avoids unlimited
    // allowance. Arbitrary tokens may require zero-reset; this demo uses known OZ tokens.
    onProgress({ phase: '等待授权签名' }); await assertSession();
    const { request } = await client.simulateContract({ account: session.account, address: input, abi: tokenAbi, functionName: 'approve', args: [deployment.exchange, amount] });
    await assertSession();
    const hash = await wallet.writeContract(request); await confirm(hash, '等待授权确认');
  }
  await assertSession(); onProgress({ phase: '读取执行报价并模拟' });
  const quoted = await client.readContract({ address: deployment.exchange, abi: exchangeAbi, functionName: 'quote', args: [buy,amount] });
  const minOut = minimumOut(quoted, bps), block = await client.getBlock();
  const { request } = await client.simulateContract({ account: session.account, address: deployment.exchange, abi: exchangeAbi, functionName: 'swap', args: [buy,amount,minOut,block.timestamp + 300n] });
  // Revalidate after awaits. A stale account/chain must never sign the next step.
  await assertSession(); onProgress({ phase: '等待交易签名' });
  const submittedHash = await wallet.writeContract(request);
  const receipt = await confirm(submittedHash, '等待链上确认');
  const hash = receipt.transactionHash;
  const output = buy ? deployment.base : deployment.quote;
  onProgress({ phase: '链上成交已确认', hash });
  // Read-model failure after a successful receipt is not transaction failure.
  // Preserve success/hash even if the RPC cannot refresh the user's balance.
  let outputBalance: bigint | undefined;
  try { outputBalance = await client.readContract({ address: output, abi: tokenAbi, functionName: 'balanceOf', args: [session.account] }); } catch { /* Surface a separate refresh warning. */ }
  return { hash, quoted, outputBalance };
}
