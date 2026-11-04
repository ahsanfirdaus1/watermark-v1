const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=path.join(__dirname,'evidence');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const results=[],errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 function check(id,pass,evidence){results.push({id,status:pass?'PASS':'FAIL',evidence});}
 try{
 await page.goto(pathToFileURL(path.join(__dirname,'redesign-prototype.html')).href);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:width===1440?1000:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const dim=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,actionsBottom:document.querySelector('.export-bar').getBoundingClientRect().bottom,viewportHeight:innerHeight}));check('reflow-'+width,dim.scroll<=width,dim);check('actions-visible-'+width,dim.actionsBottom<=dim.viewportHeight+1,dim);if(width===390||width===1440){await page.screenshot({path:path.join(out,'redesign-'+(width===390?'mobile':'desktop')+'.png'),fullPage:true});await page.screenshot({path:path.join(out,'redesign-'+(width===390?'mobile':'desktop')+'-viewport.png')});}}
 await page.setViewportSize({width:390,height:844});
 await page.locator('#language').selectOption('en');check('english',await page.locator('html').getAttribute('lang')==='en'&&await page.locator('#download').innerText()==='Simulate downloading this image ↓',{title:await page.locator('h2').innerText()});
 await page.locator('#text').fill('TEST <script>');check('safe-text',await page.locator('#markText').innerText()==='TEST <script>'&&await page.locator('#markText script').count()===0,{});
 await page.locator('[data-quality=original]').click();check('original-option',(await page.locator('#dimensions').innerText()).includes('4,032'),{});
 await page.locator('[data-mode=logo]').click();check('logo-mode',await page.locator('#textSection').isHidden()&&await page.locator('#demoLogo').isVisible(),{});
 await page.locator('[data-mode=both]').click();check('both-mode',await page.locator('#textSection').isVisible()&&await page.locator('#demoLogo').isVisible(),{});
 await page.locator('#apply').click();await page.locator('[data-image="1"]').click();check('apply-all',(await page.locator('#text').inputValue())==='TEST <script>',{});
 await page.locator('#reset').click();check('reset',await page.locator('#text').inputValue()==='KHUSUS VERIFIKASI',{});
 await page.locator('#download').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Simulation complete'));check('simulation-explicit',(await page.locator('#status').innerText()).includes('does not create download files'),{});
 await page.locator('#emptyToggle').click();check('empty-state',await page.locator('#empty').isVisible()&&await page.locator('#download').isDisabled(),{});await page.locator('#loadDemo').click();
 await page.locator('#language').selectOption('id');check('indonesian',await page.locator('html').getAttribute('lang')==='id',{});
 await page.locator('#opacity').focus();const before=Number(await page.locator('#opacity').inputValue());await page.keyboard.press('ArrowLeft');check('keyboard-slider',Number(await page.locator('#opacity').inputValue())===before-1,{});
 await page.keyboard.press('Tab');check('keyboard-next-position',(await page.evaluate(()=>document.activeElement.getAttribute('data-pos')))==='0',{});
 await page.locator('#emptyToggle').click();await page.screenshot({path:path.join(out,'redesign-mobile-empty.png'),fullPage:true});await page.locator('#loadDemo').click();
 await page.addStyleTag({content:'html{font-size:200%!important}'});const zoom=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));check('text-200-reflow',zoom.scroll<=zoom.width,zoom);await page.screenshot({path:path.join(out,'redesign-mobile-text-200.png'),fullPage:true});
 check('no-script-errors',errors.length===0,errors);check('no-network',requests.every(u=>u.startsWith('file:')),requests);
 }finally{await browser.close();fs.writeFileSync(path.join(out,'prototype-qa.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
