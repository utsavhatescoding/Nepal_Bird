import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({deviceScaleFactor:1});
const mark=readFileSync('public/favicon.svg','utf8');
try {
for(const size of [32,180,512]){
await page.setViewportSize({width:size,height:size});
await page.setContent(`<html><style>*{margin:0}svg{display:block;width:100vw;height:100vh}</style>${mark}</html>`);
await page.screenshot({path:size===32?'public/favicon-32.png':size===180?'public/apple-touch-icon.png':'public/assets/nepal-bird-mark-512.png',omitBackground:true});
}
await page.setViewportSize({width:1200,height:630});
await page.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;background:#123f32;color:#f5f8ee;font-family:Arial,sans-serif}.card{width:1200px;height:630px;padding:58px 65px;position:relative;overflow:hidden}.brand{display:flex;align-items:center;gap:18px;font-size:31px;font-weight:700}.brand svg{width:62px;height:62px;border:1px solid #426b54;border-radius:17px}.label{font-size:14px;letter-spacing:3px;color:#c0d8b8;margin-top:6px;font-weight:400}.copy{position:relative;z-index:2;max-width:710px;margin-top:54px}h1{font-size:57px;line-height:1.13;letter-spacing:-2px;font-weight:600;margin:0 0 28px}p{font-size:21px;line-height:1.7;color:#d3e0cf;max-width:600px;margin:0}.tag{display:inline-block;margin-top:33px;border-top:1px solid #5a7a60;padding-top:17px;font-size:16px;color:#d9ecc0}.large{position:absolute;right:58px;top:170px;width:285px;height:285px}.large svg{width:100%;height:100%}.ring{position:absolute;width:490px;height:490px;right:-44px;top:72px;border:1px solid #315f46;border-radius:50%}.ring:after{content:'';position:absolute;inset:34px;border:1px solid #315f46;border-radius:50%}.bottom{position:absolute;bottom:34px;right:64px;font-size:12px;color:#a6c29e;letter-spacing:2px}</style><div class="card"><div class="brand">${mark}<div>Nepal Bird ID<div class="label">BIRDS. ECOLOGY. DISCOVERY.</div></div></div><div class="ring"></div><div class="large">${mark}</div><div class="copy"><h1>Discover the bird.<br>Understand its world.</h1><p>A field companion for Nepal’s bird life,<br>habitats and conservation.</p><span class="tag">85 supported species · Identification on your device</span></div><div class="bottom">LOOK CLOSELY. TREAD LIGHTLY.</div></div></html>`);
await page.screenshot({path:'public/assets/nepal-bird-social-v2.png'});
console.log('Logo, favicon and 1200 × 630 social artwork rendered');
}finally{await browser.close()}
