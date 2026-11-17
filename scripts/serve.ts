import { spawn } from 'node:child_process';
const mode = process.argv[2] === 'dev' ? 'dev' : 'start';
const children = [
  spawn(process.execPath,['--import','tsx','scripts/feed.ts'],{stdio:'inherit'}),
  spawn(process.execPath,['node_modules/next/dist/bin/next',mode,'--hostname','127.0.0.1','--port','3000'],{stdio:'inherit'})
];
let stopping = false;
function stop(code = 0) { if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),700).unref(); }
for(const child of children) { child.on('error',()=>stop(1)); child.on('exit',code=>{if(!stopping)stop(code ?? 1);}); }
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
