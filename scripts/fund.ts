import { getAddress, parseEther, parseUnits } from 'viem';
import { localClients, deployment } from './local-chain';
import { tokenAbi } from '../contracts/abi';
const address = getAddress(process.argv[2] || '');
const { client, wallet } = await localClients(); const d = await deployment();
const response = await fetch('http://127.0.0.1:8545', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0',id:1,method:'hardhat_setBalance',params:[address,`0x${parseEther('10').toString(16)}`]}) });
const result = await response.json(); if (result.error) throw new Error(result.error.message);
for (const [token,amount] of [[d.base,parseUnits('10',18)],[d.quote,parseUnits('100000',6)]] as const) {
  const hash = await wallet.writeContract({ address:token, abi:tokenAbi, functionName:'mint', args:[address,amount] });
  if ((await client.waitForTransactionReceipt({hash})).status !== 'success') throw new Error('Mint failed');
}
console.log('Funded LOCAL TEST assets for',address);
