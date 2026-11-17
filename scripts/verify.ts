import { spawn, type ChildProcess } from 'node:child_process';
const children: ChildProcess[] = [];
const run = (args: string[]) => new Promise<void>((resolve,reject) => {
  const child = spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
  children.push(child);child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${args.join(' ')} exited ${code}`)));
});
async function wait(url: string, rpc = false) {
  for(let i=0;i<120;i++) {
    try { const r=await fetch(url,rpc?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})}:{});if(r.ok)return; }catch{}
    await new Promise(r=>setTimeout(r,500));
  }
  throw new Error(`Timed out: ${url}`);
}
try {
  // Do not stop or overwrite services that this verification process does not own.
  for(const port of [3000,4001,8545]) {
    let occupied=false;try{await fetch(`http://127.0.0.1:${port}`,{signal:AbortSignal.timeout(500)});occupied=true;}catch{}
    if(occupied)throw new Error(`Port ${port} is in use. Stop your own demo before npm run verify.`);
  }
  await run(['--import','tsx','--test','tests/unit/core.test.ts']);
  const chain=spawn(process.execPath,['node_modules/hardhat/internal/cli/cli.js','node','--hostname','127.0.0.1'],{stdio:'ignore'});children.push(chain);
  await wait('http://127.0.0.1:8545',true);
  await run(['--import','tsx','scripts/deploy.ts']);
  await run(['--import','tsx','tests/contracts.ts']);
  await run(['node_modules/next/dist/bin/next','build']);
  const server=spawn(process.execPath,['--import','tsx','scripts/serve.ts','start'],{stdio:'inherit'});children.push(server);
  await wait('http://127.0.0.1:3000');await wait('http://127.0.0.1:4001/health');
  await run(['--import','tsx','scripts/check-seo.ts']);
  await run(['node_modules/@playwright/test/cli.js','test']);
  console.log('All checks passed: unit, local contracts, Next build/typecheck, SEO, browser flows.');
} finally { for(const child of children.reverse())if(child.exitCode===null)child.kill('SIGTERM'); }
