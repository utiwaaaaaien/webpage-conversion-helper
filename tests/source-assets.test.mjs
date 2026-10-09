import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
let cancelled=false;
const sessions=new Map([['test',new Map([['asset-0',{url:'https://example.com/image'}]])]]);
const c=vm.createContext({Map,Blob,AbortSignal,globalThis:undefined});
Object.assign(c,{__atwPageSessions:sessions,FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result='data:'+blob.type+';base64,'+Buffer.from(data).toString('base64');this.onload();});}},fetch:async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}})});c.globalThis=c;
vm.runInContext(fs.readFileSync('extension/snapshot.js','utf8'),c);
assert.equal((await c.capturePageAsset('test','asset-0')).data,'data:image/png;base64,AQID');
c.fetch=async()=>({ok:true,headers:new Headers({'content-type':'image/png'}),body:{getReader:()=>({read:async()=>({done:false,value:new Uint8Array(30*1024*1024+1)}),cancel:async()=>cancelled=true,releaseLock(){}})}});
assert.match((await c.capturePageAsset('test','asset-0')).error,/30 MB/);assert.equal(cancelled,true);assert.match((await c.capturePageAsset('missing','asset-0')).error,/刷新/);console.log('Source asset streaming, size limit, reader cancellation and expired sessions passed.');
