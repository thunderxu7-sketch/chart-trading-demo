export type ConnectionInfo = { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number };
export function networkPolicy(connection: ConnectionInfo | undefined, online: boolean, manual: boolean, hidden = false) {
  if (!online) return { paused: true, reason: '离线 · 保留静态摘要' };
  if (manual) return { paused: true, reason: '手动静态模式' };
  if (hidden) return { paused: true, reason: '页面不可见 · 行情已暂停' };
  if (connection?.saveData) return { paused: true, reason: '省流模式 · 行情已暂停' };
  if (connection && (['slow-2g','2g','3g'].includes(connection.effectiveType ?? '')
    || (typeof connection.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1)
    || (connection.rtt ?? 0) >= 600)) return { paused: true, reason: '弱网模式 · 行情已暂停' };
  return { paused: false, reason: connection ? '自动网络检测' : '网络检测不可用 · 可手动切换静态模式' };
}
