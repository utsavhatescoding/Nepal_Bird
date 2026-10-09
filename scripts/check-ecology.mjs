import {chromium} from '@playwright/test';
import {preview} from 'vite';
const server=await preview({preview:{host:'127.0.0.1',port:5174}});
const browser=await chromium.launch({executablePath:process.env.BIRD_TEST_BROWSER,headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
for(const width of [320,390,768,1440]){
await page.setViewportSize({width,height:900});
for(const route of ['home','explore','ecology','about','identify','notebook']){
await page.goto(`http://127.0.0.1:5174/#${route}`);await page.locator('main h1').waitFor();
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${route} ${width}`);
}
console.log(`All routes fit ${width}px`);
}
await page.route('**/commons.wikimedia.org/w/api.php?*', route=>route.fulfill({json:{query:{pages:[{title:'File:Test bird.jpg',imageinfo:[{mime:'image/jpeg',thumburl:'https://example.org/test.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test_bird.jpg',extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'Test photographer'}}}]}]}}}));
await page.route('https://example.org/test.jpg', route=>route.fulfill({path:'public/assets/nepal-bird-hero.webp',contentType:'image/webp'}));
await page.goto('http://127.0.0.1:5174/#explore');await page.locator('#search').fill('monal');await page.locator('.guide-photo img').waitFor();
if(!await page.locator('.guide-photo .credit').innerText().then(t=>t.includes('CC BY-SA')))throw Error('Photo attribution missing');
console.log('Photo response rendering and attribution pass with controlled fixture (not a live source check)');
await page.unroute('**/commons.wikimedia.org/w/api.php?*');
await page.goto('http://127.0.0.1:5174/#ecology');
await page.getByRole('button',{name:'Scavenging',exact:true}).click();
if(!await page.locator('#role-story').innerText().then(t=>t.includes('Vultures')))throw Error('Role switch failed');
await page.locator('[data-jump="taxonomy"]').click();if(!page.url().endsWith('#ecology'))throw Error('Lesson jump broke routing');
await page.locator('summary').click();if(!await page.locator('details').getAttribute('open').then(x=>x!==null))throw Error('Taxonomy disclosure failed');
for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5174/#ecology');await page.locator('.learning-hero').waitFor();await page.screenshot({path:`docs/ecology-${width}.png`,fullPage:true});await page.goto('http://127.0.0.1:5174/#about');await page.locator('.purpose-story').waitFor();await page.screenshot({path:`docs/purpose-${width}.png`,fullPage:true});}
console.log('Interactive ecology, disclosure, internal jumps pass; errors:',errors);
if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r))}
