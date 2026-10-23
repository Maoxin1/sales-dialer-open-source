import https from 'node:https';
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';

export function privateIPv4(host) {
  if(typeof host!=='string'||!/^\d+\.\d+\.\d+\.\d+$/.test(host))return false;
  const a=host.split('.');if(a.some(s=>String(Number(s))!==s||Number(s)>255))return false;
  const [x,y]=a.map(Number);return x===10||x===172&&y>=16&&y<=31||x===192&&y===168;
}
/** TLS entry for paired native clients only. The original service stays loopback-only. */
export async function createLanGateway({host,port=8791,pfx,passphrase,pairingKey,upstreamPort=8790,testLoopback=false}) {
  if(!privateIPv4(host)&&!(testLoopback&&host==='127.0.0.1'))throw Error('PRIVATE_LAN_IPV4_REQUIRED');
  if(!Number.isInteger(port)||port<0||port>65535||!Number.isInteger(upstreamPort)||upstreamPort<1||upstreamPort>65535)throw Error('INVALID_PORT');
  if(typeof pairingKey!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(pairingKey))throw Error('INVALID_PAIRING_KEY');
  const reply=(res,status,error)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:false,error}));};
  const server=https.createServer({pfx,passphrase,minVersion:'TLSv1.2'},async(req,res)=>{
    const expectedHost=host+':'+server.address().port;
    if(req.headers.host!==expectedHost||req.headers.origin&&req.headers.origin!=='https://'+expectedHost){reply(res,403,'LAN_ORIGIN_REJECTED');return;}
    const supplied=req.headers['x-sales-pairing'];
    if(typeof supplied!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(supplied)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(pairingKey))){reply(res,403,'PAIRING_REQUIRED');return;}
    if(!(req.method==='GET'&&req.url==='/health')&&!(req.method==='POST'&&['/api/login','/api/command'].includes(req.url))){reply(res,404,'NOT_FOUND');return;}
    if(req.method==='POST'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){reply(res,415,'JSON_REQUIRED');return;}
    const chunks=[];let size=0;
    try{for await(const chunk of req){size+=chunk.length;if(size>262144){reply(res,413,'REQUEST_TOO_LARGE');return;}chunks.push(chunk);}}catch{reply(res,400,'INVALID_REQUEST');return;}
    // No redirect, retry, remote proxy target, forwarded identity or body logging.
    const upstream=http.request({host:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:{Host:'127.0.0.1:'+upstreamPort,'Content-Type':'application/json',...(req.headers.authorization?{Authorization:req.headers.authorization}:{}),'Content-Length':size},timeout:5000},incoming=>{
      res.writeHead(incoming.statusCode,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});incoming.pipe(res);incoming.on('error',()=>res.destroy());
    });upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)reply(res,503,'ENTERPRISE_UNAVAILABLE');else res.destroy();});res.on('close',()=>upstream.destroy());upstream.end(Buffer.concat(chunks));
  });
  server.requestTimeout=15000;server.headersTimeout=20000;server.keepAliveTimeout=3000;
  await new Promise((yes,no)=>{server.once('error',no);server.listen(port,host,yes);});
  return {server,url:'https://'+host+':'+server.address().port,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
