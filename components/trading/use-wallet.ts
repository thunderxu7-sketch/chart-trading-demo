'use client';
import { useEffect, useRef, useState } from 'react';
import type { WalletDetail, WalletSession } from '@/lib/types';
type Adapter = typeof import('@/lib/client/wallet-adapter');
export function useWallet() {
  const [session,setSession] = useState<WalletSession | null>(null);
  const [wallets,setWallets] = useState<WalletDetail[]>([]);
  const [show,setShow] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const adapter = useRef<Adapter | null>(null), cleanup = useRef<(() => void) | null>(null), epoch = useRef(0), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; epoch.current++; cleanup.current?.(); }; }, []);
  const discover = async () => {
    setShow(true); setError('');
    try {
      // Trade-off: the adapter is not downloaded or initialized until intent.
      adapter.current ??= await import('@/lib/client/wallet-adapter');
      if (!alive.current) return;
      cleanup.current?.(); cleanup.current = adapter.current.discover(setWallets);
    } catch { if (alive.current) setError('钱包模块加载失败，请重试'); }
  };
  const connect = async (detail: WalletDetail) => {
    const operation = ++epoch.current; setBusy(true); setError('');
    try { const next = await adapter.current!.connect(detail); if (alive.current && operation === epoch.current) { setSession(next); setShow(false); } }
    catch { if (alive.current && operation === epoch.current) setError('连接被取消或失败，可重新选择钱包'); }
    finally { if (alive.current && operation === epoch.current) setBusy(false); }
  };
  useEffect(() => {
    if (!session) return;
    const provider = session.detail.provider;
    const accounts = (value: unknown) => { epoch.current++; setBusy(false); const account = adapter.current?.accountFrom(value); setSession(s => s && account ? { ...s, account } : null); };
    const chain = (value: unknown) => { epoch.current++; setBusy(false); const chainId = Number(value); setSession(s => s && Number.isSafeInteger(chainId) ? { ...s, chainId } : null); };
    const disconnect = () => { epoch.current++; setBusy(false); setSession(null); };
    provider.on?.('accountsChanged', accounts); provider.on?.('chainChanged', chain); provider.on?.('disconnect', disconnect);
    return () => { provider.removeListener?.('accountsChanged', accounts); provider.removeListener?.('chainChanged', chain); provider.removeListener?.('disconnect', disconnect); };
  }, [session?.detail.provider]);
  const switchChain = async () => {
    if (!session || !adapter.current) return;
    setError('');
    try { await adapter.current.switchLocal(session.detail.provider); const chainId = Number(await session.detail.provider.request({ method: 'eth_chainId' })); setSession(s => s ? { ...s, chainId } : null); }
    catch { setError('切换网络失败，请确认本地节点已启动'); }
  };
  return { session, wallets, show, busy, error, discover, connect, switchChain, close: () => setShow(false),
    disconnect: () => { epoch.current++; setBusy(false); setSession(null); } };
}
