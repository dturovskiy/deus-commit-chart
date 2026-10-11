#!/usr/bin/env node
'use strict';

// Runs an actual browser with only Node 22 built-ins and the Chrome bundled
// on GitHub ubuntu-latest runners. No Playwright install or scheduled job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { setTimeout: sleep } = require('node:timers/promises');

function chromeBinary() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']) {
    const found=spawnSync('which',[name],{encoding:'utf8'});
    if(found.status===0) return found.stdout.trim();
  }
  throw Error('Headless Chrome/Chromium unavailable; cannot claim real-browser QA');
}

class CDP {
  constructor(socket) {
    this.socket=socket;this.nextId=0;this.pending=new Map();this.requests=[];
    socket.addEventListener('message', ({data})=>{
      const msg=JSON.parse(data);
      if(msg.method==='Network.requestWillBeSent')this.requests.push(msg.params?.request?.url);
      const pending=this.pending.get(msg.id);
      if(!pending)return;
      this.pending.delete(msg.id);
      if(msg.error)pending.reject(Error('CDP '+JSON.stringify(msg.error)));
      else pending.resolve(msg.result);
    });
  }
  send(method, params={}) {
    return new Promise((resolve,reject)=>{
      const id=++this.nextId;
      this.pending.set(id,{resolve,reject});
      this.socket.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(expression) {
    const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error('Browser evaluation failed: '+result.exceptionDetails.text);
    return result.result.value;
  }
}
async function waitUntil(task, maxMs=12000) {
  const started=Date.now(), errors=[];
  while(Date.now()-started<maxMs){
    try{
      const value=await task();
      if(value)return value;
    }catch(error){errors.push(error.message);}
    await sleep(100);
  }
  throw Error('Browser condition timed out: '+errors.slice(-2).join('; '));
}
async function main() {
  assert.ok(process.argv[2], 'Usage: node ci/browser-smoke.js generated/index.html');
  const html=path.resolve(process.argv[2]);
  assert.ok(fs.statSync(html).size>0);
  assert.equal(typeof WebSocket,'function','Node 22 built-in WebSocket required');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'deus-chromium-'));
  const browser=spawn(chromeBinary(),[
    '--headless=new','--no-sandbox','--disable-gpu',
    '--disable-dev-shm-usage','--disable-background-networking',
    '--no-first-run','--no-default-browser-check',
    '--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',()=>{}); // Do not log browser diagnostic paths.
  let socket;
  try {
    const portFile=path.join(temp,'DevToolsActivePort');
    const port=await waitUntil(()=>{
      if(browser.exitCode!==null)throw Error('Chrome exited before remote debugging');
      if(!fs.existsSync(portFile))return null;
      const p=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
      return p>0?p:null;
    });
    const targets=await waitUntil(async()=>{
      const res=await fetch('http://127.0.0.1:'+port+'/json/list');
      assert.ok(res.ok);
      return (await res.json()).find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
    });
    socket=new WebSocket(targets.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
      socket.addEventListener('open',resolve,{once:true});
      socket.addEventListener('error',reject,{once:true});
    });
    const cdp=new CDP(socket);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',
      {width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await cdp.send('Page.navigate',{url:pathToFileURL(html).href});
    await waitUntil(()=>cdp.eval("document.readyState==='complete' && document.querySelector('#stat-total')?.textContent !== '—'"));

    for(const range of [30,90,365]) {
      await cdp.eval("document.querySelector('button[data-range=\""+range+"\"]').click()");
      const view=await cdp.eval("({active:document.querySelector('button[aria-pressed=\"true\"]')?.dataset.range,total:document.querySelector('#stat-total').textContent,chart:document.querySelector('#chart').innerHTML,hash:location.hash,peak:document.querySelector('#stat-peak').textContent})");
      assert.equal(view.active,String(range));
      assert.equal(view.total,'3');
      assert.equal(view.hash,'#'+range+'d');
      assert.match(view.chart,/data-chart-series="daily-bars"/);
      assert.match(view.chart,/data-series="trend"/);
      assert.match(view.peak,/2/);
    }
    const tooltip=await cdp.eval("(()=>{const chart=document.querySelector('#chart');const r=chart.getBoundingClientRect();const payload=JSON.parse(document.getElementById('chart-data').textContent);const layout=payload.layout;const x=r.left+r.width*(layout.width-layout.pad.right-0.1)/layout.width;chart.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:r.top+60,bubbles:true}));return {visible:getComputedStyle(document.querySelector('#tooltip')).display,html:document.querySelector('#tooltip').innerHTML};})()");
    assert.equal(tooltip.visible,'block');
    assert.match(tooltip.html,/>Daily<\/span><b>2<\/b>/);
    assert.match(tooltip.html,/>7d trend<\/span><b>/);

    console.log('BROWSER_CHECK: desktop range switching and tooltip passed');
    // Genuine narrow-viewport CSS/layout, not jsdom or mock DOM.
    await cdp.send('Emulation.setDeviceMetricsOverride',
      {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await cdp.send('Page.reload',{ignoreCache:true});
    await waitUntil(()=>cdp.eval("document.readyState==='complete' && document.querySelector('#stat-total')?.textContent === '3'"));
    const mobile=await cdp.eval("(()=>{const scroller=document.querySelector('#chart-scroll');return {innerWidth:innerWidth,bodyWidth:document.documentElement.scrollWidth,chartWidth:document.getElementById('chart').getBoundingClientRect().width,clientWidth:scroller.clientWidth,scrollWidth:scroller.scrollWidth,scrollLeft:scroller.scrollLeft,hint:getComputedStyle(document.querySelector('#chart-scroll-hint')).display,focusable:scroller.tabIndex,accessible:document.getElementById('chart').getAttribute('aria-label')}})()");
    assert.equal(mobile.innerWidth,390);
    assert.ok(mobile.bodyWidth<=mobile.innerWidth+1,JSON.stringify(mobile));
    assert.ok(mobile.chartWidth>mobile.clientWidth,JSON.stringify(mobile));
    assert.ok(mobile.scrollWidth>mobile.clientWidth,JSON.stringify(mobile));
    assert.ok(mobile.scrollLeft>0,JSON.stringify(mobile));
    assert.notEqual(mobile.hint,'none');
    assert.equal(mobile.focusable,0);
    assert.ok(mobile.accessible);
    console.log('BROWSER_CHECK: 390px mobile layout and scroll passed');
    // A real key event activates a focused range button via the browser.
    await cdp.eval("document.querySelector('button[data-range=\"90\"]').focus()");
    await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitUntil(()=>cdp.eval("location.hash==='#90d' && document.querySelector('button[data-range=\"90\"]').getAttribute('aria-pressed')==='true'"));
    assert.equal(cdp.requests.filter(url=>/^https?:\/\//i.test(url||'')).length,0,
      'Self-contained generated HTML must not make remote network requests');
    console.log('REAL_BROWSER_PASS: desktop 30/90/365, tooltip, 390px responsive layout, scroll, keyboard, no HTTP requests');
  } finally {
    if(socket)socket.close();
    browser.kill('SIGTERM');
    for(let i=0;i<30 && browser.exitCode===null && browser.signalCode===null;i++)await sleep(100);
    if(browser.exitCode===null && browser.signalCode===null)browser.kill('SIGKILL');
    await sleep(250);
    // Do not mask the original browser assertion with Chrome profile cleanup.
    try {fs.rmSync(temp,{recursive:true,force:true,maxRetries:8,retryDelay:150});}
    catch {console.error('Browser temp profile cleanup incomplete');}
  }
}
main().catch(err=>{console.error('REAL_BROWSER_FAILURE: '+err.message);process.exitCode=1});
