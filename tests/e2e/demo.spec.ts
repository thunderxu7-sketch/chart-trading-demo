import { test,expect,type Page } from '@playwright/test';
import { localClients,deployment } from '../../scripts/local-chain';
import { tokenAbi } from '../../contracts/abi';
async function injectWallet(page: Page, options: { wrongChain?:boolean; reject?:boolean } = {}) {
  const {accounts}=await localClients();
  await page.addInitScript(({accounts,options})=>{
    const listeners=new Map<string,Set<(arg:unknown)=>void>>();
    let selected: string=accounts[0],chain=options.wrongChain?'0x1':'0x7a69';
    const w=window as unknown as {walletMethods:string[];changeAccount:(address:string)=>void};w.walletMethods=[];
    const provider={
      on(event:string,fn:(arg:unknown)=>void){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event)!.add(fn);},
      removeListener(event:string,fn:(arg:unknown)=>void){listeners.get(event)?.delete(fn);},
      async request({method,params}:{method:string;params?:unknown[]}){
        w.walletMethods.push(method);
        if(method==='eth_requestAccounts'||method==='eth_accounts')return[selected];
        if(method==='eth_chainId')return chain;
        if(method==='wallet_switchEthereumChain'){chain='0x7a69';listeners.get('chainChanged')?.forEach(f=>f(chain));return null;}
        if(method==='eth_sendTransaction'&&options.reject){const e=new Error('User rejected request') as Error & {code:number};e.code=4001;throw e;}
        const response=await fetch('http://127.0.0.1:8545',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:params||[]})});
        const result=await response.json();if(result.error)throw Object.assign(new Error(result.error.message),result.error);return result.result;
      }
    };
    w.changeAccount=(address:string)=>{selected=address;listeners.get('accountsChanged')?.forEach(f=>f([address]));};
    const wallets=['Test Alpha','Test Beta'].map((name,i)=>({info:{uuid:`e6963000-0000-4000-8000-00000000000${i+1}`,name,rdns:`test.wallet${i}`,icon:'data:image/svg+xml,<svg/>'},provider}));
    window.addEventListener('eip6963:requestProvider',()=>{for(const detail of [...wallets,wallets[0]])window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail}));});
  },{accounts,options});
}
test('public RSC content is readable with JavaScript disabled',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  await page.goto('/trade/eth-musd');
  await expect(page.getByTestId('server-summary')).toContainText('历史行情摘要');
  await expect(page.getByTestId('server-details')).toContainText('0.30%');
  await expect(page.locator('h1')).toContainText('ETH / mUSD');
  await page.goto('/faq');await expect(page.locator('h1')).toContainText('交易前');
  await context.close();
});
test('live chart, slippage validation, paper buy/sell and desktop layout',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/trade/eth-musd');await expect(page.getByTestId('chart')).toBeVisible();
  await expect(page.getByTestId('feed-status')).toContainText('已连接');
  await page.getByRole('button',{name:'5m',exact:true}).click();await expect(page.getByTestId('chart')).toHaveAttribute('aria-label',/5 分钟/);
  // Third-party charts use internal tables; global td padding can silently crop
  // the price axis while the page itself still has no horizontal overflow.
  expect(await page.getByTestId('chart').evaluate(el=>{
    const outer=el.getBoundingClientRect();
    return [...el.querySelectorAll('canvas')].every(canvas=>{const r=canvas.getBoundingClientRect();return r.left>=outer.left-1&&r.right<=outer.right+1;});
  })).toBe(true);
  await page.getByLabel('滑点上限').fill('5.01');await expect(page.getByRole('button',{name:'模拟买入 ETH',exact:true})).toBeDisabled();
  await page.getByLabel('滑点上限').fill('0.50');await page.getByRole('button',{name:'模拟买入 ETH',exact:true}).click();
  await expect(page.getByTestId('trade-status')).toContainText('模拟成交完成');
  await expect(page.locator('.fills')).toContainText('无链上 hash');
  await page.getByRole('button',{name:'卖出 ETH',exact:true}).click();await page.getByRole('button',{name:'模拟卖出 ETH',exact:true}).click();
  await expect(page.locator('.fills')).toContainText('2 笔');
  await page.screenshot({path:'test-results/trading-desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('weak-network policy prevents WS/chart; recovery connects; saveData closes the socket',async({page})=>{
  await page.addInitScript(()=>{
    const connection=Object.assign(new EventTarget(),{effectiveType:'2g',downlink:.2,rtt:800,saveData:false});
    Object.defineProperty(navigator,'connection',{value:connection,configurable:true});
  });
  let opened=0,closed=0;page.on('websocket',ws=>{opened++;ws.on('close',()=>closed++);});
  await page.goto('/trade/eth-musd');await expect(page.getByTestId('feed-status')).toContainText('弱网模式');
  await expect(page.getByTestId('chart-skeleton')).toBeVisible();await expect(page.getByTestId('chart')).toHaveCount(0);expect(opened).toBe(0);
  await expect(page.getByTestId('server-summary')).toBeVisible();
  await page.evaluate(()=>{const c=(navigator as Navigator & {connection:EventTarget & {effectiveType:string;downlink:number;rtt:number}}).connection;Object.assign(c,{effectiveType:'4g',downlink:10,rtt:30});c.dispatchEvent(new Event('change'));});
  await expect(page.getByTestId('feed-status')).toContainText('已连接');expect(opened).toBe(1);
  await page.evaluate(()=>{const c=(navigator as Navigator & {connection:EventTarget & {saveData:boolean}}).connection;c.saveData=true;c.dispatchEvent(new Event('change'));});
  await expect(page.getByTestId('feed-status')).toContainText('省流模式');await expect.poll(()=>closed).toBe(1);
  await expect(page.getByTestId('chart')).toHaveCount(0);
});
test('unsupported Network API keeps manual fallback; mobile has no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:undefined,configurable:true}));
  await page.goto('/trade/eth-musd');await expect(page.getByTestId('chart')).toBeVisible();
  await expect(page.getByTestId('feed-status')).toContainText('不支持自动弱网检测');
  await page.getByLabel('静态模式',{exact:true}).check();await expect(page.getByTestId('feed-status')).toContainText('手动静态模式');
  await expect(page.getByTestId('chart-skeleton')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/trading-mobile-static.png',fullPage:true});
});
test('EIP-6963 selection, lazy adapter/ABI, wrong-chain guard, real approve + swap receipt',async({page})=>{
  await injectWallet(page,{wrongChain:true});
  const scripts:Promise<string>[]=[];page.on('response',r=>{if(r.url().includes('/_next/static/')&&r.url().split('?')[0].endsWith('.js'))scripts.push(r.text().catch(()=>''));});
  await page.goto('/trade/eth-musd');await expect(page.getByTestId('chart')).toBeVisible();
  expect((await Promise.all(scripts)).join('')).not.toContain('eip6963:requestProvider');
  expect((await Promise.all(scripts)).join('')).not.toContain('function swap(bool buy');
  await page.getByRole('button',{name:'连接钱包'}).click();await expect(page.locator('.wallet-choice')).toHaveCount(2);
  await page.getByRole('button',{name:/Test Beta/}).click();
  expect((await Promise.all(scripts)).join('')).toContain('eip6963:requestProvider');
  expect((await Promise.all(scripts)).join('')).not.toContain('function swap(bool buy');
  await page.getByRole('button',{name:'本地合约',exact:true}).click();await expect(page.getByRole('button',{name:'合约买入 ETH',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'切换至本地网络'}).click();await expect(page.getByRole('button',{name:'合约买入 ETH',exact:true})).toBeEnabled();
  const {client,account}=await localClients();const d=await deployment();
  const before=await client.readContract({address:d.base,abi:tokenAbi,functionName:'balanceOf',args:[account]});
  await page.getByRole('button',{name:'合约买入 ETH',exact:true}).click();
  await expect(page.getByTestId('trade-status')).toContainText('链上成交已确认',{timeout:30000});
  const after=await client.readContract({address:d.base,abi:tokenAbi,functionName:'balanceOf',args:[account]});expect(after>before).toBe(true);
  expect((await Promise.all(scripts)).join('')).toContain('function swap(bool buy');
  const requests=await page.evaluate(()=>(window as unknown as {walletMethods:string[]}).walletMethods);expect(requests.filter(m=>m==='eth_sendTransaction')).toHaveLength(2);
  await expect(page.locator('.fills')).toContainText('链上');
});
test('wallet rejection produces an error, never a fabricated successful fill',async({page})=>{
  await injectWallet(page,{reject:true});await page.goto('/trade/eth-musd');
  await page.getByRole('button',{name:'连接钱包'}).click();await page.getByRole('button',{name:/Test Alpha/}).click();
  await page.getByRole('button',{name:'本地合约',exact:true}).click();await page.getByRole('button',{name:'合约买入 ETH',exact:true}).click();
  await expect(page.getByTestId('trade-status')).toContainText('交易未完成');await expect(page.locator('.fills')).toContainText('还没有成交记录');
});
test('account changes update the selected session; navigation disposes the market connection',async({page})=>{
  await injectWallet(page);let closed=0;page.on('websocket',ws=>ws.on('close',()=>closed++));
  await page.goto('/trade/eth-musd');await expect(page.getByTestId('feed-status')).toContainText('已连接');
  await page.getByRole('button',{name:'连接钱包'}).click();await page.getByRole('button',{name:/Test Alpha/}).click();
  const {accounts}=await localClients();await page.evaluate(address=>(window as unknown as {changeAccount:(a:string)=>void}).changeAccount(address),accounts[2]);
  await expect(page.locator('.wallet-connected')).toContainText(accounts[2].slice(0,6));
  await page.getByRole('link',{name:'FAQ',exact:true}).click();await expect.poll(()=>closed).toBe(1);
});
test('a balance RPC failure after a successful receipt does not erase the confirmed trade',async({page})=>{
  await injectWallet(page);const d=await deployment();
  await page.route('http://127.0.0.1:8545/',async route=>{
    const body=route.request().postDataJSON();
    if(body.method==='eth_call'&&body.params?.[0]?.to?.toLowerCase()===d.base.toLowerCase()&&body.params[0].data?.startsWith('0x70a08231')) {
      await route.fulfill({contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:body.id,error:{code:-32000,message:'Injected balance read failure'}})});
    } else await route.continue();
  });
  await page.goto('/trade/eth-musd');await page.getByRole('button',{name:'连接钱包'}).click();await page.getByRole('button',{name:/Test Alpha/}).click();
  await page.getByRole('button',{name:'本地合约',exact:true}).click();await page.getByRole('button',{name:'合约买入 ETH',exact:true}).click();
  await expect(page.getByTestId('trade-status')).toContainText('余额刷新暂不可用',{timeout:30000});
  await expect(page.getByTestId('trade-status')).toContainText('链上成交已确认');await expect(page.locator('.fills')).toContainText('链上');
});
