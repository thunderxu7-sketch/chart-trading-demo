import { parseAbi } from 'viem';
// Trade-off: ABI is a separate async module, not an RSC prop or eager UI import.
export const tokenAbi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function mint(address to, uint256 amount)'
]);
export const exchangeAbi = parseAbi([
  'function quote(bool buy, uint256 amountIn) pure returns (uint256)',
  'function swap(bool buy, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)',
  'function base() view returns (address)',
  'function quoteToken() view returns (address)',
  'error Expired()', 'error Slippage()', 'error ZeroAmount()'
]);
