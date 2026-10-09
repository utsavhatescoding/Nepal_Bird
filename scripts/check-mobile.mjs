import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdirSync } from 'node:fs';
const server = await preview({preview:{host:'127.0.0.1',port:5176}});
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
mkdirSync('docs/mobile',{recursive:true});
try {
 for (const width of [320,390,600,640,768,820,1024,1100,1440]) {
  await page.setViewportSize({width,height:844});
  for (const route of ['home','identify','explore','ecology','notebook','about']) {
   await page.goto(`http://127.0.0.1:5176/#${route}`);
   await page.locator('main h1').waitFor();
   const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth);
   if (overflow) throw Error(`Overflow: ${width} ${route}`);
   if (width<=1024) {
    const links=await page.locator('.app-nav a').evaluateAll(els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
    if(links.some(e=>e.w<44||e.h<44))throw Error('Small navigation target '+width);
    if(route!=='home' && await page.locator('.app-nav a[aria-current="page"]').getAttribute('href')!==`#${route}`)throw Error('Navigation state '+route);
   }
   if ([390,820].includes(width) && ['home','identify','ecology','explore'].includes(route)) await page.screenshot({path:`docs/mobile/${route}-${width}.png`,fullPage:route!=='explore'});
  }
  console.log('All routes fit; navigation targets pass:',width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.app-nav a[href="#explore"]').click();
 await page.locator('#search').fill('monal');
 if(await page.locator('.catalog-card').count()!==1)throw Error('Guide search');
 await page.locator('.guide-copy').click();
 await page.locator('#profile-save').click();
 await page.locator('[name=location]').fill('Kathmandu park');
 await page.getByRole('button',{name:'Save field note',exact:true}).click();
 await page.locator('.app-nav a[href="#notebook"]').click();
 await page.locator('.notebook-item').waitFor();
 await page.locator('.app-nav a[href="#ecology"]').click();
 await page.locator('.role-tab').last().click();
 if(await page.locator('.role-tab[aria-pressed=true]').count()!==1)throw Error('Role tabs');
 if(errors.length) throw Error(errors.join('\n'));
 console.log('Mobile navigation, search, species dialog, notebook and ecology controls pass. No page errors.');
} finally { await browser.close(); await new Promise(r=>server.httpServer.close(r)); }
