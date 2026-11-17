// Trade-off: keep tiny exact-integer helpers in the initial UI bundle; viem loads
// only on a signing action. Never use floating-point numbers for token amounts.
export function parseAmount(text: string, decimals: number): bigint {
  if (text.length > 80 || !/^\d+(\.\d+)?$/.test(text)) throw new Error('请输入有效的正数金额');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) throw new Error(`最多支持 ${decimals} 位小数`);
  const amount = BigInt(whole + fraction.padEnd(decimals, '0'));
  if (amount <= 0n || amount >= 2n ** 256n) throw new Error('金额超出范围');
  return amount;
}
export function slippageBps(text: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(text) || text.length > 6) throw new Error('滑点须为 0–5%，最多两位小数');
  const [whole, part = ''] = text.split('.');
  const bps = BigInt(whole) * 100n + BigInt(part.padEnd(2,'0'));
  if (bps > 500n) throw new Error('滑点不能超过 5%');
  return bps;
}
export function minimumOut(quote: bigint, bps: bigint) {
  if (bps < 0n || bps > 500n || quote <= 0n) throw new Error('无效报价或滑点');
  const result = quote * (10000n - bps) / 10000n;
  if (result === 0n) throw new Error('金额过小');
  return result;
}
export function demoQuote(buy: boolean, amount: bigint) {
  const net = amount * 9970n / 10000n;
  return buy ? net * 10n ** 18n / 2845000000n : net * 2845000000n / 10n ** 18n;
}
export function formatAmount(amount: bigint, decimals: number, precision = 6) {
  const s = amount.toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, -decimals) || '0';
  const part = s.slice(-decimals).slice(0, precision).replace(/0+$/, '');
  return part ? `${whole}.${part}` : whole;
}
export const price = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
