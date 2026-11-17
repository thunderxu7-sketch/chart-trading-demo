'use client';
import { useEffect, useRef, useState } from 'react';
import type { MarketSnapshot, TradeProgress } from '@/lib/types';
import { demoQuote, formatAmount, minimumOut, parseAmount, slippageBps } from '@/lib/money';
import { useWallet } from './use-wallet';
type Fill = { id: string; side: string; amount: string; mode: string; hash?: string };
export function TradeForm({ market, onFill }: { market: MarketSnapshot; onFill: (fill: Fill) => void }) {
  const wallet = useWallet();
  const [buy,setBuy] = useState(true), [mode,setMode] = useState<'paper'|'contract'>('paper');
  const [amount,setAmount] = useState('1000'), [slippage,setSlippage] = useState('0.50');
  const [busy,setBusy] = useState(false), [progress,setProgress] = useState<TradeProgress>({ phase: '等待订单' });
  const [balance,setBalance] = useState('');
  const [unresolvedHash,setUnresolvedHash] = useState('');
  const alive = useRef(true), locked = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setBalance(''); if (!locked.current) setProgress({ phase: '等待订单' }); }, [wallet.session?.account, wallet.session?.chainId, buy, mode]);
  let parsed = 0n, bps = 0n, quote = 0n, min = 0n, validation = '';
  try { parsed = parseAmount(amount, buy ? 6 : 18); bps = slippageBps(slippage); quote = demoQuote(buy, parsed); min = minimumOut(quote,bps); }
  catch (e) { validation = (e as Error).message; }
  const wrongChain = !!wallet.session && wallet.session.chainId !== 31337;
  const submit = async () => {
    if (locked.current || validation || (mode === 'contract' && unresolvedHash)) return;
    locked.current = true; setBusy(true); setBalance('');
    const report = (p: TradeProgress) => { if (alive.current) setProgress(p); };
    try {
      if (mode === 'paper') {
        report({ phase: '正在模拟成交' }); await new Promise(resolve => setTimeout(resolve, 450));
        if (!alive.current) return;
        onFill({ id: crypto.randomUUID(), side: buy ? '买入' : '卖出', amount: formatAmount(quote, buy ? 18 : 6), mode: '模拟' });
        report({ phase: '模拟成交完成 · 未发起签名' });
      } else {
        if (!wallet.session || !market.deployment) throw new Error('请先连接钱包并部署本地合约');
        // Trade-off: wallet adapter and ABI/viem execution code are separate lazy
        // chunks. SSR renders the form shell; signing runs only after this click.
        const executor = await import('@/lib/client/trade-executor');
        const result = await executor.executeTrade({ session: wallet.session, deployment: market.deployment, buy, amount: parsed, bps, onProgress: report });
        if (!alive.current) return;
        onFill({ id: result.hash, side: buy ? '买入' : '卖出', amount: formatAmount(result.quoted,buy ? 18 : 6), mode: '链上', hash: result.hash });
        setBalance(result.outputBalance === undefined ? '成交已确认，余额刷新暂不可用，请稍后重新查询。' : `成交账户 ${wallet.session.account.slice(0,6)}… 的 ${buy ? 'ETH' : 'mUSD'} 余额：${formatAmount(result.outputBalance,buy ? 18 : 6)}`);
      }
    } catch (e) {
      const error = e as { name?: string; message?: string; shortMessage?: string; hash?: string };
      // A confirmation timeout is not a failed transaction. Freeze contract
      // resubmission in this session; production needs durable pending-tx recovery.
      if (alive.current && error.hash) setUnresolvedHash(error.hash);
      report({ phase: error.hash ? '结果待确认' : '交易未完成', error: (error.shortMessage || error.message || '交易失败').slice(0,240), hash: error.hash });
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  };
  return <section className="trade-form panel"><header className="panel-title"><h2>下单</h2><span className="muted">市价兑换</span></header>
    <div className="segmented mode-switch" aria-label="交易模式">{(['paper','contract'] as const).map(m => <button key={m} disabled={busy} className={mode === m ? 'selected' : ''} onClick={() => setMode(m)} aria-pressed={mode === m}>{m === 'paper' ? '模拟交易' : '本地合约'}</button>)}</div>
    <div className="side-tabs"><button disabled={busy} className={buy ? 'active buy' : ''} aria-pressed={buy} onClick={() => {setBuy(true); setAmount('1000');}}>买入 ETH</button><button disabled={busy} className={!buy ? 'active sell' : ''} aria-pressed={!buy} onClick={() => {setBuy(false); setAmount('0.1');}}>卖出 ETH</button></div>
    <label className="field-label" htmlFor="amount">支付数量</label><div className="input-wrap"><input id="amount" inputMode="decimal" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} autoComplete="off" aria-invalid={!!validation} /><span>{buy ? 'mUSD' : 'ETH'}</span></div>
    <div className="slippage-row"><label htmlFor="slippage">滑点上限</label><div className="small-input"><input id="slippage" inputMode="decimal" value={slippage} disabled={busy} onChange={e => setSlippage(e.target.value)} /><span>%</span></div></div>
    <dl className="quote-details"><div><dt>参考收到</dt><dd data-testid="quote">{validation ? '—' : formatAmount(quote,buy ? 18 : 6)} {buy ? 'ETH' : 'mUSD'}</dd></div><div><dt>最少收到</dt><dd>{validation ? '—' : formatAmount(min,buy ? 18 : 6)}</dd></div><div><dt>交易费率</dt><dd>0.30%</dd></div><div><dt>测试兑换比率</dt><dd>2,845 mUSD / ETH</dd></div></dl>
    {validation && <p className="error" role="alert">{validation}</p>}
    <div className="wallet-section">{wallet.session ? <><div className="wallet-connected"><span>◉ {wallet.session.account.slice(0,6)}…{wallet.session.account.slice(-4)}</span><button className="text-button" disabled={busy} onClick={wallet.disconnect}>断开</button></div><p className={wrongChain ? 'error small' : 'muted small'}>网络 {wallet.session.chainId}{wrongChain ? ' · 请切换本地测试链' : ' · 本地测试链'}</p>{wrongChain && <button className="secondary full" disabled={busy} onClick={wallet.switchChain}>切换至本地网络</button>}</> : <button className="secondary full" onClick={wallet.discover} disabled={busy}>连接钱包 <span>↗</span></button>}
      {wallet.show && <div className="wallet-picker" role="region" aria-label="选择钱包"><div className="picker-title"><strong>选择 EVM 钱包</strong><button className="text-button" onClick={wallet.close}>关闭</button></div>{wallet.wallets.length ? wallet.wallets.map(w => <button className="wallet-choice" key={w.info.uuid} disabled={wallet.busy} onClick={() => wallet.connect(w)}><span className="wallet-avatar">{w.info.name[0]}</span>{w.info.name}<span>↗</span></button>) : <p className="small muted">未发现 EIP-6963 钱包。安装支持的扩展后重新发现。</p>}<button className="text-button" onClick={wallet.discover} disabled={wallet.busy}>重新发现</button></div>}
      {wallet.error && <p role="alert" className="error">{wallet.error}</p>}</div>
    <button className={`primary full execute ${!buy ? 'sell-button' : ''}`} disabled={busy || !!validation || (mode === 'contract' && (!wallet.session || wrongChain || !market.deployment || !!unresolvedHash))} onClick={submit}>{busy ? '处理中…' : `${mode === 'paper' ? '模拟' : '合约'}${buy ? '买入 ETH' : '卖出 ETH'}`}</button>
    {unresolvedHash && <p className="error small">存在待确认交易，合约下单已锁定。请先在本地节点核查：<code>{unresolvedHash}</code></p>}
    <p className="small muted">{mode === 'paper' ? '无需钱包 · 仅本页会话记录 · 不产生交易 hash' : !market.deployment ? '本地合约尚未部署，请先完成运行指南中的部署步骤。' : '仅测试资产 · 首次交易可能需要先签名授权，再签名兑换。执行前重新读取链上报价。'}</p>
    <div className="trade-progress" role="status" data-testid="trade-status"><span className={progress.error ? 'error' : 'positive'}>{progress.phase}</span>{progress.error && <p>{progress.error}</p>}{progress.hash && <code>Hash: {progress.hash}</code>}{balance && <p>{balance}</p>}</div>
  </section>;
}
