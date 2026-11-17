import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { parseAmount,slippageBps,minimumOut,demoQuote,formatAmount } from '../../lib/money';
import { networkPolicy } from '../../lib/network-policy';
import { aggregateCandles } from '../../lib/candles';
import { isFrame,isSnapshot } from '../../lib/market-validation';
import { makeSnapshot } from '../../lib/market-fixture';
import { isWalletDetail } from '../../lib/client/wallet-adapter';
test('token inputs preserve 6/18 decimal precision beyond Number.MAX_SAFE_INTEGER',()=>{
  assert.equal(parseAmount('1.000001',6),1000001n);
  assert.equal(parseAmount('999999.000000000000000001',18),999999000000000000000001n);
  assert.equal(formatAmount(1000001n,6),'1.000001');
  for(const invalid of ['1e3','-1','0','NaN','1.0000001',''])assert.throws(()=>parseAmount(invalid,6));
});
test('slippage bounds and minimum output use exact integer rounding',()=>{
  assert.equal(slippageBps('0'),0n);assert.equal(slippageBps('0.50'),50n);assert.equal(slippageBps('5'),500n);
  assert.equal(minimumOut(101n,50n),100n);
  for(const s of ['5.01','-1','0.001','Infinity'])assert.throws(()=>slippageBps(s));
  assert.throws(()=>minimumOut(1n,500n));
  assert.equal(demoQuote(false,10n**18n),2836465000n);
});
test('network policy supports saveData, 3G, offline and API absence without assuming strong connectivity',()=>{
  assert.equal(networkPolicy({effectiveType:'4g',saveData:true},true,false).paused,true);
  assert.equal(networkPolicy({effectiveType:'3g'},true,false).paused,true);
  assert.equal(networkPolicy({rtt:600},true,false).paused,true);
  assert.equal(networkPolicy({downlink:.5},true,false).paused,true);
  assert.equal(networkPolicy(undefined,false,false).paused,true);
  assert.equal(networkPolicy(undefined,true,true).paused,true);
  assert.equal(networkPolicy(undefined,true,false,true).paused,true);
  assert.equal(networkPolicy(undefined,true,false).paused,false);
  assert.match(networkPolicy(undefined,true,false).reason,/不可用/);
});
test('candle aggregation preserves OHLC and does not mutate the source',()=>{
  const input=[{time:300,open:10,high:13,low:9,close:12},{time:360,open:12,high:15,low:11,close:14},{time:600,open:14,high:16,low:13,close:15}];
  const copy=JSON.stringify(input);
  assert.deepEqual(aggregateCandles(input,5),[{time:300,open:10,high:15,low:9,close:14},{time:600,open:14,high:16,low:13,close:15}]);
  assert.equal(JSON.stringify(input),copy);
});
test('untrusted feed messages and remote snapshots are bounded and validated',()=>{
  const s=makeSnapshot();assert.equal(isSnapshot(s),true);
  const valid={symbol:s.symbol,sequence:1,candle:s.candles[0],asks:s.asks,bids:s.bids};
  assert.equal(isFrame(valid),true);assert.equal(isFrame({...valid,symbol:'OTHER'}),false);
  assert.equal(isFrame({...valid,candle:{...valid.candle,close:Infinity}}),false);
  assert.equal(isFrame({...valid,asks:Array(100).fill(s.asks[0])}),false);
  assert.equal(isSnapshot({...s,candles:[s.candles[1],s.candles[0]]}),false);
});
test('wallet discovery rejects malformed announcements',()=>{
  assert.equal(isWalletDetail({}),false);
  const valid={info:{uuid:'e6963000-0000-4000-8000-000000000001',name:'Test',rdns:'test.wallet',icon:'data:image/svg+xml,<svg/>'},provider:{request:async()=>[]}};
  assert.equal(isWalletDetail(valid),true);
  assert.equal(isWalletDetail({...valid,info:{...valid.info,uuid:'not-a-uuid'}}),false);
});
test('architectural guard: route pages/layout remain RSC and server data cannot import signing code',()=>{
  for(const file of ['app/layout.tsx','app/page.tsx','app/faq/page.tsx','app/markets/[pair]/page.tsx','app/trade/[pair]/page.tsx','lib/server/market.ts']){
    const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    for(const statement of source.statements){
      if(ts.isExpressionStatement(statement)&&ts.isStringLiteral(statement.expression))assert.notEqual(statement.expression.text,'use client',file);
      if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier))assert.doesNotMatch(statement.moduleSpecifier.text,/wallet-adapter|trade-executor|contracts\/abi|tronweb/i,file);
    }
  }
  assert.match(readFileSync('lib/server/market.ts','utf8'),/import 'server-only'/);
});
