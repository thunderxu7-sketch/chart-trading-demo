import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { makeBook, makeSnapshot } from '../lib/market-fixture';
const snapshot = makeSnapshot();
const server = createServer((req,res) => {
  if (req.url === '/snapshot') { res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(snapshot)); }
  else if (req.url === '/health') { res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,clients:wss.clients.size})); }
  else { res.writeHead(404);res.end(); }
});
const wss = new WebSocketServer({ server, maxPayload: 32000 });
let sequence = 0;
let current = snapshot.candles.at(-1)!;
const interval = setInterval(() => {
  const open = current.close, close = +(open + Math.sin(sequence * 1.37) * 4.5 + .2).toFixed(2);
  current = { time: current.time + 60, open, close, high: Math.max(open,close)+2, low: Math.min(open,close)-2 };
  sequence++;
  const frame = JSON.stringify({ symbol:snapshot.symbol,sequence,candle:current,...makeBook(close) });
  for (const client of wss.clients) if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 64000) client.send(frame);
}, 1500);
server.listen(4001,'127.0.0.1',() => console.log('Synthetic feed: ws://127.0.0.1:4001'));
function stop(){ clearInterval(interval);for(const client of wss.clients)client.terminate();wss.close();server.close(()=>process.exit(0)); }
process.on('SIGTERM',stop);process.on('SIGINT',stop);
