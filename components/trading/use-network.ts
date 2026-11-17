'use client';
import { useEffect, useState } from 'react';
import { networkPolicy, type ConnectionInfo } from '@/lib/network-policy';
type Connection = ConnectionInfo & EventTarget;
export function useNetwork(manual: boolean) {
  const [state,setState] = useState({ ready: false, paused: true, reason: '正在检测网络' });
  useEffect(() => {
    // Trade-off: capability detection only after hydration prevents a server/client
    // mismatch. Safari/Firefox may lack this API; never equate unknown with fast.
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setState({ ready: true, ...networkPolicy(connection, navigator.onLine, manual, document.hidden) });
    update(); connection?.addEventListener('change', update);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    document.addEventListener('visibilitychange', update);
    return () => { connection?.removeEventListener('change', update); window.removeEventListener('online', update); window.removeEventListener('offline', update); document.removeEventListener('visibilitychange', update); };
  }, [manual]);
  return state;
}
