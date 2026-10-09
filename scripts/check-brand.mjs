import {chromium} from '@playwright/test';
import {preview} from 'vite';
import {readFileSync} from 'node:fs';
const server=await preview({preview:{host:'127.0.0.1',port:5175}});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
for(const width of [320,390,768,1440,1920]){
 await page.setViewportSize({width,height:1000});
 for(const route of ['home','identify','explore','ecology','notebook','about']){
  await page.goto(`http://127.0.0.1:5175/#${route}`);await page.locator('main h1').waitFor();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${route} ${width}`);
 }
 console.log('All routes fit',width);
}
for(const width of [1920,1440,390]){
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5175/');await page.locator('.hero').waitFor();
 await page.locator('.hero>img').evaluate(img=>img.decode());
 const sizes=await page.evaluate(()=>({heroWidth:document.querySelector('.hero').getBoundingClientRect().width,bodyText:getComputedStyle(document.querySelector('.hero-copy p')).fontSize}));
 console.log('Home sizing',width,sizes);if(width===1920&&sizes.heroWidth<1700)throw Error('Desktop content remains too narrow');
 await page.screenshot({path:`docs/brand-home-${width}.png`,fullPage:true});
}
for(const path of ['/favicon.svg','/favicon-32.png','/favicon.ico','/apple-touch-icon.png','/assets/nepal-bird-social-v2.png']){
 const response=await page.request.get('http://127.0.0.1:5175'+path);if(!response.ok())throw Error('Missing brand asset '+path);
}
if(errors.length)throw Error(errors.join('\n'));console.log('Brand assets and responsive layout pass; no page errors');
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r))}
