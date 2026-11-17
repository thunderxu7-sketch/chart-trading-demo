import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { hardhat } from 'viem/chains';
import { readFile } from 'node:fs/promises';
import type { Deployment } from '../lib/types';
export async function localClients(index = 0) {
  const client = createPublicClient({ chain: hardhat, transport: http('http://127.0.0.1:8545') });
  if (await client.getChainId() !== 31337) throw new Error('Refusing non-local chain');
  const discovery = createWalletClient({ chain: hardhat, transport: http('http://127.0.0.1:8545') });
  const accounts = await discovery.getAddresses();
  if (!accounts[index]) throw new Error('No local unlocked test account');
  const wallet = createWalletClient({ account: accounts[index], chain: hardhat, transport: http('http://127.0.0.1:8545') });
  return { client, wallet, accounts, account: accounts[index] as Address };
}
export async function deployment(): Promise<Deployment> { return JSON.parse(await readFile('data/deployment.json','utf8')); }
