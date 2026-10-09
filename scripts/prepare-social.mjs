import {readFileSync,writeFileSync} from 'node:fs';
const raw=process.env.SITE_URL || process.env.CF_PAGES_URL;
if(raw){
 const base=new URL(raw);
 if(!['https:','http:'].includes(base.protocol))throw new Error('SITE_URL must use https or http');
 base.pathname='/';base.search='';base.hash='';
 const image=new URL('/assets/nepal-bird-social-v2.png',base).href;
 let html=readFileSync('dist/index.html','utf8');
 html=html.replaceAll('content="/assets/nepal-bird-social-v2.png"',`content="${image.replaceAll('&','&amp;').replaceAll('"','&quot;')}"`);
 html=html.replace('</head>',`<meta property="og:url" content="${base.href}" /></head>`);
 writeFileSync('dist/index.html',html);
 console.log('Social preview uses absolute image URL for',base.hostname);
}else console.log('Local build: relative social image. Cloudflare supplies the deployment URL during its build.');
