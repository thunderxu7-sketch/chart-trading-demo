import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Compilation occurs only in this local CLI, never in a page or client bundle.
import solc from 'solc';
import { parseUnits, type Abi, type Hex } from 'viem';
import { localClients } from './local-chain';
import { tokenAbi } from '../contracts/abi';
const { client, wallet, account } = await localClients();
const compiled = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'MockExchange.sol': { content: readFileSync('contracts/MockExchange.sol','utf8') } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi','evm.bytecode.object'] } } } }), {
  import: (file: string) => { try { return { contents: readFileSync(path.join('node_modules',file),'utf8') }; } catch { return { error: `Missing import ${file}` }; } }
}));
const errors = (compiled.errors || []).filter((e: { severity: string }) => e.severity === 'error');
if (errors.length) throw new Error(JSON.stringify(errors));
async function deploy(name: string, args: unknown[]) {
  const artifact = compiled.contracts['MockExchange.sol'][name] as { abi: Abi; evm: { bytecode: { object: string } } };
  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` as Hex, args });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress || receipt.status !== 'success') throw new Error('Deployment failed');
  return receipt.contractAddress;
}
const base = await deploy('TestToken',['Demo Ether','dETH',18]);
const quote = await deploy('TestToken',['Demo Dollar','mUSD',6]);
const exchange = await deploy('MockExchange',[base,quote]);
for (const [address, to, amount] of [[base,exchange,parseUnits('1000000',18)],[quote,exchange,parseUnits('2000000000',6)],[base,account,parseUnits('10',18)],[quote,account,parseUnits('100000',6)]] as const) {
  const hash = await wallet.writeContract({ address, abi: tokenAbi, functionName: 'mint', args: [to,amount] });
  const receipt = await client.waitForTransactionReceipt({ hash }); if (receipt.status !== 'success') throw new Error('Mint failed');
}
await mkdir('data',{recursive:true});
await writeFile('data/deployment.json', JSON.stringify({ chainId: 31337, base,quote,exchange }, null, 2)+'\n');
console.log('Deployed local test contracts:', { base,quote,exchange });
