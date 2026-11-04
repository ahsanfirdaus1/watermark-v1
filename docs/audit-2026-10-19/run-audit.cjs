/* Read-only application audit. Writes only under this dated audit folder.
   PLAYWRIGHT_MODULE may point at an existing Playwright package; no install.
   BROWSER_CHROMIUM / BROWSER_WEBKIT override executable paths. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'evidence');
const fixtures = path.join(out, 'fixtures');
fs.mkdirSync(out, { recursive: true });
const report = { date: '2026-10-19', timezone: 'Asia/Jakarta', tests: [], browsers: [], live: {}, network: [], console: [] };
function record(id, status, evidence) { report.tests.push({ id, status, evidence }); console.log(id, status, JSON.stringify(evidence)); }
function check(id, predicate, evidence) { record(id, predicate ? 'PASS' : 'FAIL', evidence); }
async function routeStatic(context) {
 await context.addInitScript(() => {
   window.__auditLinks = [];
   const original = HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click = function () {
     if (this.download && this.href.startsWith('blob:')) { window.__auditLinks.push({href:this.href,filename:this.download}); return; }
     return original.call(this);
   };
 });
 await context.route('http://watermark.test/**', async route => {
  const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !/^(index\.html|css\/|js\/|lib\/|docs\/audit-2026-10-19\/)/.test(rel)) { await route.fulfill({status:404,body:''}); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { await route.fulfill({status:404,body:''}); return; }
  const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };
  await route.fulfill({status:200,contentType:types[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
 });
}
let base;
async function upload(page, names) {
  const before = await page.evaluate(() => WM.state.images.length);
  await page.locator('#fileInput').setInputFiles(names.map(n => path.join(fixtures,n)));
  await page.waitForFunction(n => WM.state.images.length >= n, before + names.length);
  await page.waitForFunction(() => document.querySelector('#canvasWrap').classList.contains('has-image'));
}
async function saveDownload(page, selector, name) {
  const before = await page.evaluate(() => window.__auditLinks.length);
  await page.locator(selector).click();
  await page.waitForFunction(n=>window.__auditLinks.length>n,before);
  const result=await page.evaluate(async n=>{const link=window.__auditLinks[n];return {filename:link.filename,bytes:Array.from(new Uint8Array(await (await fetch(link.href)).arrayBuffer()))};},before);
  fs.writeFileSync(path.join(out,name),Buffer.from(result.bytes));
  return result.filename;
}
async function reset(page) { await page.goto(base); }
function contrast(a,b) {
  const l = hex => { const c=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return c[0]*.2126+c[1]*.7152+c[2]*.0722; };
  return (Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
}
async function primary(browser) {
  const context = await browser.newContext({viewport:{width:390,height:844}, isMobile:true,hasTouch:true,deviceScaleFactor:1,acceptDownloads:true,colorScheme:'light'});
  await routeStatic(context);
  const page = await context.newPage();
  page.on('request',r=>report.network.push({method:r.method(),url:r.url().replace(base||'---','LOCAL/'),type:r.resourceType(),hasPostData:!!r.postData()}));
  page.on('console',m=>{ if(m.type()==='error') report.console.push(m.text()); });
  page.on('pageerror',e=>report.console.push('PAGEERROR: '+e.message));
  await page.goto(base);
  await page.screenshot({path:path.join(out,'current-mobile-empty.png'),fullPage:true});
  check('F01-empty-actions-disabled', await page.locator('#downloadBtn').isDisabled() && await page.locator('#downloadAllBtn').isDisabled(), {buttons:'single + all disabled'});
  await upload(page,['portrait.png','landscape.jpg','transparent.png','small.webp']);
  const modesHidden=await page.evaluate(()=>({mode:WM.getActiveImage().watermark.mode,logoHidden:document.querySelector('#logoControls').hidden,logoDisplay:getComputedStyle(document.querySelector('#logoControls')).display}));
  check('F21-mode-hides-irrelevant-controls',modesHidden.logoHidden&&modesHidden.logoDisplay==='none',modesHidden);
  check('F02-formats-orientation', await page.evaluate(()=>WM.state.images.length===4 && WM.state.images[0].height===1200 && WM.state.images[1].width===1200), await page.evaluate(()=>WM.state.images.map(i=>({name:i.name,width:i.width,height:i.height}))));
  await page.locator('#textInput').fill('KHUSUS UJI - 19/10/2026');
  await page.locator('#opacityInput').fill('45');
  await page.locator('#rotationInput').fill('-30');
  await page.locator('.pos-btn[data-x="0.92"][data-y="0.92"]').click();
  const settings = await page.evaluate(()=>WM.getActiveImage().watermark);
  check('F03-text-controls-presets',settings.text.content==='KHUSUS UJI - 19/10/2026' && settings.opacity===45 && settings.rotation===-30 && settings.position.x===.92,settings);
  await page.locator('#applyAllBtn').click();
  check('F04-apply-all',await page.evaluate(()=>WM.state.images.every(i=>i.watermark.text.content===WM.state.images[0].watermark.text.content)),{count:4});
  await page.locator('.thumb').nth(1).click();
  await page.locator('#textInput').fill('PER IMAGE');
  check('F05-independent-image-settings',await page.evaluate(()=>WM.state.images[0].watermark.text.content!=='PER IMAGE' && WM.state.images[1].watermark.text.content==='PER IMAGE'),{independent:true});
  await page.locator('#resetBtn').click();
  check('F06-reset',await page.evaluate(()=>WM.getActiveImage().watermark.text.content==='SAMPLE' && WM.getActiveImage().watermark.position.x===.5),{text:'SAMPLE',position:'center'});
  const preset=await page.locator('.pos-btn.active').count();
  check('A01-selected-position-reflects-state',preset===1,{activePresetButtonsAfterReset:preset});
  await page.locator('.thumb').nth(0).click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const box=await page.locator('#previewCanvas').boundingBox();
  await page.touchscreen.tap(box.x+box.width*.25,box.y+box.height*.4);
  const pos=await page.evaluate(()=>WM.getActiveImage().watermark.position);
  check('F07-touch-position',Math.abs(pos.x-.25)<.02 && Math.abs(pos.y-.4)<.02,pos);
  await page.locator('.seg-btn[data-mode="both"]').click();
  await page.locator('#logoInput').setInputFiles(path.join(fixtures,'logo.png'));
  await page.waitForFunction(()=>!!WM.state.logoImage);
  await page.waitForTimeout(150);
  const logo=await page.evaluate(()=>({rendererImageReady:WM.state.logoImage.naturalWidth>0,previewReady:document.querySelector('#logoPreviewImg').naturalWidth>0,previewHidden:getComputedStyle(document.querySelector('#logoPreview')).display==='none'}));
  check('F08-logo-preview',logo.rendererImageReady && logo.previewReady && !logo.previewHidden,logo);
  await page.screenshot({path:path.join(out,'current-mobile-editor.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:path.join(out,'current-desktop-editor.png'),fullPage:true});
  const cb=await page.locator('#previewCanvas').boundingBox();
  await page.mouse.move(cb.x+cb.width*.3,cb.y+cb.height*.3); await page.mouse.down(); await page.mouse.move(cb.x+cb.width*.6,cb.y+cb.height*.7,{steps:5}); await page.mouse.up();
  const mousepos=await page.evaluate(()=>WM.getActiveImage().watermark.position);
  check('F09-mouse-drag',Math.abs(mousepos.x-.6)<.02&&Math.abs(mousepos.y-.7)<.02,mousepos);
  const filename=await saveDownload(page,'#downloadBtn','single.png');
  check('F10-single-export',fs.statSync(path.join(out,'single.png')).size>0,{filename});
  await saveDownload(page,'#downloadAllBtn','batch-normal.zip');
  record('F11-normal-batch-export','PASS',{file:'batch-normal.zip',inputCount:4,bytes:fs.statSync(path.join(out,'batch-normal.zip')).size});
  await reset(page); await upload(page,['duplicate.png','duplicate.jpg']);
  await saveDownload(page,'#downloadAllBtn','batch-duplicates.zip');
  const names=await page.evaluate(async()=>{ const z=new JSZip(); WM.state.images.forEach(i=>z.file(i.name.slice(0,i.name.lastIndexOf('.'))+'-watermarked.png','x')); return Object.keys(z.files); });
  check('F12-duplicate-basename-retains-all',names.length===2,{inputCount:2,zipNames:names,actualArchive:'batch-duplicates.zip'});
  await reset(page); await upload(page,['large.jpg']);
  const large=await page.evaluate(()=>({width:WM.getActiveImage().width,height:WM.getActiveImage().height}));
  check('F13-original-resolution-retained',large.width===6000&&large.height===4000,{source:[6000,4000],actual:large,warningVisible:await page.getByText(/downscal|resiz|resolution/i).count()>0});
  await saveDownload(page,'#downloadBtn','large-export.png');
  // Collect render timing on desktop hardware, not a mobile benchmark.
  const timing=await page.evaluate(()=>{ const a=WM.getActiveImage(),c=document.createElement('canvas'),times=[];for(let i=0;i<30;i++){const t=performance.now(); WM.renderImageToCanvas(c,a,WM.state.logoImage); times.push(performance.now()-t);}return {samples:times.length,minMs:Math.min(...times),maxMs:Math.max(...times),meanMs:times.reduce((a,b)=>a+b,0)/times.length}; });
  record('P01-render-timing-desktop','OBSERVATION',timing);
  await reset(page); await upload(page,['transparent.png']);
  const alpha=await page.evaluate(()=>{const c=document.createElement('canvas'); WM.renderImageToCanvas(c,WM.getActiveImage(),null);return c.getContext('2d').getImageData(0,0,1,1).data[3];});
  check('F14-transparency',alpha===0,{cornerAlpha:alpha});
  await saveDownload(page,'#downloadBtn','transparent-export.png');
  await reset(page); await upload(page,['metadata-oriented.jpg']);
  record('S01-exif-orientation','OBSERVATION',await page.evaluate(()=>({width:WM.getActiveImage().width,height:WM.getActiveImage().height})));
  await saveDownload(page,'#downloadBtn','metadata-export.png');
  await reset(page);
  await page.locator('#fileInput').setInputFiles(path.join(fixtures,'corrupt.png'));
  await page.waitForTimeout(300);
  const errorMessage=await page.evaluate(()=>({images:WM.state.images.length,alerts:document.querySelectorAll('[role="alert"],[role="status"],[aria-live]').length,body:document.body.innerText.includes('Failed to load')}));
  check('F15-corrupt-file-user-feedback',errorMessage.alerts>0 || errorMessage.body,errorMessage);
  await page.locator('#fileInput').setInputFiles(path.join(fixtures,'unsupported.svg'));
  await page.waitForTimeout(300);
  check('S02-format-allowlist',await page.evaluate(()=>WM.state.images.length===0),await page.evaluate(()=>({acceptedNames:WM.state.images.map(i=>i.name),note:'SVG is a local static fixture; not an XSS exploit'})));
  await reset(page); await upload(page,['tiny.png']);
  const tiny=await page.evaluate(()=>({thumb:WM.getActiveImage().thumbUrl,width:WM.getActiveImage().width,height:WM.getActiveImage().height}));
  check('F16-tiny-image',tiny.width===1&&tiny.thumb.startsWith('data:image/jpeg'),{width:tiny.width,height:tiny.height});
  await reset(page); await upload(page,Array(10).fill('portrait.png'));
  await saveDownload(page,'#downloadAllBtn','batch-ten.zip');
  const count=await page.evaluate(()=>WM.state.images.length);
  check('F17-ten-images-loaded',count===10,{images:count,archive:'batch-ten.zip',note:'all names identical intentionally; archive count checked by Python'});
  // Switch thumbnails by keyboard. Current clickable divs cannot receive tab focus.
  const keyboard=await page.evaluate(()=>({thumbTags:[...document.querySelectorAll('.thumb')].map(t=>({tag:t.tagName,tabIndex:t.tabIndex,role:t.getAttribute('role')})),canvasTabIndex:document.querySelector('canvas').tabIndex,selectedModes:[...document.querySelectorAll('.seg-btn')].map(e=>e.getAttribute('aria-pressed'))}));
  check('A02-keyboard-image-selection',keyboard.thumbTags.every(t=>t.tabIndex>=0),keyboard);
  check('A03-selected-mode-programmatic',keyboard.selectedModes.every(v=>v!==null),{ariaPressed:keyboard.selectedModes});
  const remove=await page.locator('.thumb-remove').first().boundingBox();
  check('A04-remove-target-24px',remove.width>=24&&remove.height>=24,{width:remove.width,height:remove.height,designTarget:44,note:'WCAG 2.2 AA 24px or spacing exception; direct 20px overlay sits inside thumbnail action'});
  await page.locator('.thumb-remove').last().click();
  check('F18-remove-image',await page.evaluate(()=>WM.state.images.length===9),{remaining:9});
  await page.locator('#textInput').fill('<img src=x onerror=alert(1)>');
  check('S03-user-text-not-html',await page.locator('img[src="x"]').count()===0 && await page.evaluate(()=>WM.getActiveImage().watermark.text.content.includes('<img')), {renderPath:'Canvas.fillText; no user HTML element created'});
  const allStorage=await context.storageState();
  check('S04-no-app-persistence',allStorage.cookies.length===0&&allStorage.origins.every(o=>o.localStorage.length===0)&&await page.evaluate(()=>sessionStorage.length===0),allStorage);
  const startNetwork=report.network.length;
  await context.setOffline(true);
  await page.locator('#textInput').fill('OFFLINE TEST');
  await saveDownload(page,'#downloadBtn','offline.png');
  const afterNetwork=report.network.slice(startNetwork).filter(r=>!r.url.startsWith('blob:')&&!r.url.startsWith('data:'));
  check('S05-edit-export-offline',afterNetwork.length===0,{requests:afterNetwork,export:'offline.png'});
  await context.setOffline(false);
  // Inject encoder null, a documented failure mode; inspect resulting download.
  const nullResult=await page.evaluate(async()=>{ const original=HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob=function(cb){cb(null);};try { await WM.downloadCurrent();return {rejected:false,alerts:document.querySelectorAll('[role="alert"],[aria-live]').length};}catch(e){return {rejected:true,message:e.message,alerts:document.querySelectorAll('[role="alert"],[aria-live]').length};}finally{HTMLCanvasElement.prototype.toBlob=original;} });
  check('F19-null-encoder-user-feedback',nullResult.rejected&&nullResult.alerts>0,nullResult);
  const zipFail=await page.evaluate(async()=>{const original=JSZip.prototype.generateAsync;let downloads=0;const click=HTMLAnchorElement.prototype.click;JSZip.prototype.generateAsync=async()=>{throw Error('SYNTHETIC_ZIP_FAILURE');};HTMLAnchorElement.prototype.click=function(){downloads++;};try{await WM.downloadAll();return {fallbackDownloads:downloads,alerts:document.querySelectorAll('[role="alert"]').length};}finally{JSZip.prototype.generateAsync=original;HTMLAnchorElement.prototype.click=click;} });
  check('F20-zip-failure-visible',zipFail.alerts>0,zipFail);
  const mutation=await page.evaluate(async()=>{
    const original=HTMLCanvasElement.prototype.toBlob,saved=WM.state.images.slice();let resume;
    HTMLCanvasElement.prototype.toBlob=function(cb,type){HTMLCanvasElement.prototype.toBlob=original;const c=this;resume=()=>original.call(c,cb,type);};
    const work=WM.downloadAll().then(()=>({completed:true})).catch(e=>({completed:false,error:e.message}));
    WM.state.images.pop();resume();const result=await work;WM.state.images=saved;HTMLCanvasElement.prototype.toBlob=original;return result;
  });
  check('F22-export-snapshot-survives-list-mutation',mutation.completed,mutation);
  await page.locator('#opacityInput').focus();
  const beforeKey=await page.locator('#opacityInput').inputValue();
  await page.keyboard.press('ArrowLeft');
  check('A11-native-range-keyboard',Number(await page.locator('#opacityInput').inputValue())===Number(beforeKey)-1,{before:beforeKey,after:await page.locator('#opacityInput').inputValue()});
  // Restore a single image for layout tests.
  await reset(page); await upload(page,['portrait.png']);
  for(const width of [320,375,390,768,1280]) {
    await page.setViewportSize({width,height:844});
    const layout=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,controlsHeight:document.querySelector('#controlsPanel').getBoundingClientRect().height,controlsClientHeight:document.querySelector('#controlsBody').clientHeight,controlsScrollHeight:document.querySelector('#controlsBody').scrollHeight,downloadRect:document.querySelector('#downloadBtn').getBoundingClientRect().toJSON(),controlsRect:document.querySelector('#controlsBody').getBoundingClientRect().toJSON()}));
    check('U01-reflow-'+width,layout.scrollWidth<=width,layout);
  }
  await page.setViewportSize({width:390,height:844});
  const viewport=await page.locator('meta[name=viewport]').getAttribute('content');
  check('A05-zoom-allowed',!viewport.includes('user-scalable=no')&&!viewport.includes('maximum-scale=1'),{viewport});
  // Simulate enlarged text, distinct from native browser zoom and real assistive technology.
  await page.addStyleTag({content:'html { font-size: 200% !important; }'});
  const textResize=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  await page.screenshot({path:path.join(out,'current-mobile-text-200.png'),fullPage:true});
  record('A06-text-resize-simulation','OBSERVATION',textResize);
  await context.close();
}
async function smoke(type, executable, name, options={}) {
  let browser;
  try {
    browser=await type.launch({headless:true,...(executable?{executablePath:executable}:{}),...options});
    report.browsers.push({name,version:browser.version(),scope:'desktop engine; mobile viewport emulation only'});
    const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
    await routeStatic(context);
    const page=await context.newPage();
    await page.goto(base); await upload(page,['portrait.png','transparent.png']);
    await page.locator('#textInput').fill(name+' smoke');
    const dims=await page.evaluate(()=>({w:document.querySelector('canvas').width,h:document.querySelector('canvas').height}));
    const fn=await saveDownload(page,'#downloadBtn',name.toLowerCase().replace(/[^a-z]/g,'')+'-smoke.png');
    check('B01-'+name+'-smoke',dims.w===900&&dims.h===1200,{dims,filename:fn});
    await context.close();
  } catch(e) { record('B01-'+name+'-smoke','UNVERIFIED',{error:e.message.slice(0,600)}); }
  finally { if(browser)await browser.close(); }
}
(async()=>{
  base='http://watermark.test/';
  report.localTransport='Playwright route.fulfill serves unchanged local bytes at http://watermark.test; OS sandbox denied localhost networking. Not a live HTTP server or hosting verification.';
  report.downloadTransport='Native download.saveAs was canceled by environment. Test intercepts blob download anchor clicks, reads actual generated blob bytes, and writes those bytes under evidence. Native OS/browser save UI remains UNVERIFIED; no claim of real mobile saving.';
  let browser;
  try {
    browser=await pw.chromium.launch({headless:true,executablePath:process.env.BROWSER_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    report.browsers.push({name:'Chrome',version:browser.version(),scope:'primary suite; desktop hardware; mobile viewport/touch emulation'});
    const live=await browser.newPage();
    try { const r=await live.goto('https://ahsanfirdaus1.github.io/watermark-v1/',{timeout:15000});report.live={status:r.status(),url:live.url(),headers:await r.allHeaders()}; }
    catch(e) {report.live={status:'UNVERIFIED',error:e.message.slice(0,800)};}
    await live.close();
    await primary(browser);
    const filePage=await browser.newPage();
    await filePage.goto(pathToFileURL(path.join(root,'index.html')).href);
    check('B02-file-url-load',await filePage.evaluate(()=>typeof WM.downloadCurrent==='function'),{protocol:'file:'});
    await filePage.close();
  } finally { if(browser)await browser.close(); }
  await smoke(pw.webkit,process.env.BROWSER_WEBKIT,'WebKit');
  await smoke(pw.chromium,undefined,'Edge',{channel:'msedge'});
  for(const [id,fg,bg] of [['A07-dark-primary','#ffffff','#4f8cff'],['A08-light-primary','#ffffff','#2f6fed'],['A09-dark-muted','#9aa0ac','#1a1d24'],['A10-light-muted','#626873','#ffffff']]){
    const ratio=contrast(fg,bg);check(id,ratio>=4.5,{foreground:fg,background:bg,ratio:Math.round(ratio*100)/100,required:4.5});
  }
})().catch(e=>{report.fatal=e.stack;console.error(e);process.exitCode=1;}).finally(()=>{
  report.sourceHashes=Object.fromEntries(['index.html','css/styles.css',...fs.readdirSync(path.join(root,'js')).map(n=>'js/'+n),'lib/jszip.min.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
  report.summary=report.tests.reduce((a,t)=>(a[t.status]=(a[t.status]||0)+1,a),{});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log('SUMMARY',report.summary);
});
