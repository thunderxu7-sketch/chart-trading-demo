import type { Provider, WalletDetail, WalletSession } from '../types';
// Lazy browser-only adapter. EIP-6963 details are untrusted: UUID/name are not
// identity proofs. Never insert wallet SVG into innerHTML; UI uses text initials.
export function isWalletDetail(value: unknown): value is WalletDetail {
  if (!value || typeof value !== 'object') return false;
  const d = value as WalletDetail;
  return typeof d.provider?.request === 'function' && typeof d.info?.uuid === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.info.uuid)
    && typeof d.info.name === 'string' && d.info.name.length > 0 && d.info.name.length <= 80
    && typeof d.info.rdns === 'string' && typeof d.info.icon === 'string';
}
export function discover(onWallets: (wallets: WalletDetail[]) => void) {
  const wallets = new Map<string, WalletDetail>();
  const announce = (event: Event) => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (!isWalletDetail(detail) || wallets.has(detail.info.uuid) || wallets.size >= 20) return;
    wallets.set(detail.info.uuid, detail); onWallets([...wallets.values()]);
  };
  // Register before requesting to avoid losing synchronous announcements.
  window.addEventListener('eip6963:announceProvider', announce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  return () => window.removeEventListener('eip6963:announceProvider', announce);
}
export function accountFrom(value: unknown): `0x${string}` | null {
  return Array.isArray(value) && typeof value[0] === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value[0]) ? value[0] as `0x${string}` : null;
}
export async function connect(detail: WalletDetail): Promise<WalletSession> {
  const account = accountFrom(await detail.provider.request({ method: 'eth_requestAccounts' }));
  if (!account) throw new Error('钱包未提供有效账户');
  const chainId = Number(await detail.provider.request({ method: 'eth_chainId' }));
  if (!Number.isSafeInteger(chainId)) throw new Error('钱包返回了无效网络');
  return { detail, account, chainId };
}
export async function switchLocal(provider: Provider) {
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7a69' }] }); }
  catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x7a69', chainName: 'ARC Local Testnet', nativeCurrency: { name: 'Test Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['http://127.0.0.1:8545'] }] });
  }
}
