import assert from 'node:assert/strict';
import { parseUnits } from 'viem';
import { localClients,deployment } from '../scripts/local-chain';
import { tokenAbi,exchangeAbi } from '../contracts/abi';
import { demoQuote } from '../lib/money';
const { client,wallet,account }=await localClients(1);const d=await deployment();
for(const [address,amount] of [[d.base,parseUnits('10',18)],[d.quote,parseUnits('10000',6)]] as const){
  const hash=await wallet.writeContract({address,abi:tokenAbi,functionName:'mint',args:[account,amount]});await client.waitForTransactionReceipt({hash});
}
const amount=parseUnits('1000',6), deadline=(await client.getBlock()).timestamp+300n;
const before=await client.readContract({address:d.base,abi:tokenAbi,functionName:'balanceOf',args:[account]});
await assert.rejects(()=>client.simulateContract({account,address:d.exchange,abi:exchangeAbi,functionName:'swap',args:[true,amount,1n,deadline]}));
const approve=await wallet.writeContract({address:d.quote,abi:tokenAbi,functionName:'approve',args:[d.exchange,amount]});await client.waitForTransactionReceipt({hash:approve});
const quote=await client.readContract({address:d.exchange,abi:exchangeAbi,functionName:'quote',args:[true,amount]});
assert.equal(quote,demoQuote(true,amount));
await assert.rejects(()=>client.simulateContract({account,address:d.exchange,abi:exchangeAbi,functionName:'swap',args:[true,amount,quote+1n,deadline]}));
await assert.rejects(()=>client.simulateContract({account,address:d.exchange,abi:exchangeAbi,functionName:'swap',args:[true,amount,1n,1n]}));
await assert.rejects(()=>client.simulateContract({account,address:d.exchange,abi:exchangeAbi,functionName:'swap',args:[true,0n,1n,deadline]}));
const {request}=await client.simulateContract({account,address:d.exchange,abi:exchangeAbi,functionName:'swap',args:[true,amount,quote,deadline]});
const hash=await wallet.writeContract(request);assert.equal((await client.waitForTransactionReceipt({hash})).status,'success');
const after=await client.readContract({address:d.base,abi:tokenAbi,functionName:'balanceOf',args:[account]});assert.equal(after-before,quote);
assert.equal(await client.readContract({address:d.quote,abi:tokenAbi,functionName:'allowance',args:[account,d.exchange]}),0n);
// Selling uses 18 -> 6 decimals: verify the opposite direction too.
const sellAmount=parseUnits('0.1',18);
const sellApproval=await wallet.writeContract({address:d.base,abi:tokenAbi,functionName:'approve',args:[d.exchange,sellAmount]});await client.waitForTransactionReceipt({hash:sellApproval});
const sellQuote=await client.readContract({address:d.exchange,abi:exchangeAbi,functionName:'quote',args:[false,sellAmount]});assert.equal(sellQuote,demoQuote(false,sellAmount));
const usdBefore=await client.readContract({address:d.quote,abi:tokenAbi,functionName:'balanceOf',args:[account]});
const sell=await wallet.writeContract({address:d.exchange,abi:exchangeAbi,functionName:'swap',args:[false,sellAmount,sellQuote,deadline]});await client.waitForTransactionReceipt({hash:sell});
assert.equal(await client.readContract({address:d.quote,abi:tokenAbi,functionName:'balanceOf',args:[account]})-usdBefore,sellQuote);
console.log('Contract PASS: buy/sell balance deltas, exact allowance, decimals, missing approval, minOut, deadline, zero amount.');
