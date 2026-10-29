import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const themes=['light','sepia','deped-green','dark','navy','noir'];
const init=readFileSync('dist/assets/theme-init.js','utf8');
for(const saved of [...themes,'invalid',null]){
 const root={dataset:{}};vm.runInNewContext(init,{document:{documentElement:root},localStorage:{getItem:()=>saved}});
 assert.equal(root.dataset.theme,themes.includes(saved)?saved:'light');
}
const root={dataset:{}};vm.runInNewContext(init,{document:{documentElement:root},localStorage:{getItem(){throw Error('Blocked storage')}}});assert.equal(root.dataset.theme,'light');
const brand=readFileSync('dist/assets/brand-theme.js','utf8');
for(const theme of themes){
 const attrs={src:'./assets/klasama-mark.svg'},img={dataset:{},closest:()=>null,getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};
 vm.runInNewContext(brand,{document:{documentElement:{getAttribute:()=>theme},querySelectorAll:s=>s.startsWith('img')?[img]:[]},MutationObserver:class{observe(){}}});
 assert.equal(attrs.src,`./assets/klasama-mark-${theme==='dark'?'white':theme}.svg`);
}
const sw=readFileSync('dist/sw.js','utf8');
const precache=JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1].replace(/'([^']*)'/g,'"$1"'));
for(const html of ['dist/index.html','dist/workspace.html'])for(const m of readFileSync(html,'utf8').matchAll(/(?:src|href)="(\.\/assets\/[^"#]+)"/g))assert(precache.includes(m[1]),`Offline asset missing: ${m[1]}`);
let handlers={},deleted=[],cached=[],networkResponse={ok:false,status:503,clone(){return this}},fallback;
const caches={open:async()=>({addAll:async()=>{},put:async(req)=>cached.push(req)}),keys:async()=>['klasama-old','another-app-cache'],delete:async k=>deleted.push(k),match:async k=>(fallback=k,{ok:true})};
const self={location:{origin:'https://example.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(n,fn)=>handlers[n]=fn};
vm.runInNewContext(sw,{self,caches,URL,fetch:async()=>networkResponse});
let task;handlers.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['klasama-old']);
let response;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/workspace.html'},respondWith:p=>response=p});await response;assert.equal(cached.length,0,'503 must not replace offline HTML');
vm.runInNewContext(sw,{self,caches,URL,fetch:async()=>{throw Error('Offline')}});
handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/workspace.html'},respondWith:p=>response=p});await response;assert.equal(fallback,'./workspace.html');
handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/'},respondWith:p=>response=p});await response;assert.equal(fallback,'./index.html');
let skipped=false;vm.runInNewContext(sw,{self:{...self,skipWaiting:async()=>{skipped=true}},caches:{...caches,open:async()=>({addAll:async()=>{throw Error('Missing asset')}})},URL,fetch:async()=>{}});
handlers.install({waitUntil:p=>task=p});await assert.rejects(task);assert.equal(skipped,false,'An incomplete offline shell must not replace a working version');
// Core palette text and primary actions must meet WCAG AA normal-text contrast.
const css=readFileSync('dist/assets/theme-palettes.css','utf8');
function luminance(hex){const rgb=[0,2,4].map(i=>parseInt(hex.slice(1+i,3+i),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const [lo,hi]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (hi+.05)/(lo+.05)}
let palettes=0;
for(const match of css.matchAll(/:root(?:,:root)?\[data-theme=([^\]]+)\]\{([^}]+)\}/g)){
 const values=Object.fromEntries([...match[2].matchAll(/--theme-([a-z-]+):(#[0-9a-f]+)/g)].map(m=>[m[1],m[2]]));if(!values.opaque)continue;palettes++;
 for(const role of ['ink','muted','accent'])assert(contrast(values[role],values.opaque)>=4.5,`${match[1]} ${role} contrast`);
 for(const role of ['action','action-hover'])assert(contrast(values.on,values[role])>=4.5,`${match[1]} ${role} contrast`);
}assert.equal(palettes,6);
// Exercise the actual navigation method with a delayed renderer: completion must wait for it.
const app=readFileSync('dist/assets/app.js','utf8');
const start=app.indexOf('async navigate(e){'),end=app.indexOf(',getPageMeta(e){',start);
let release,ended=0;const gate=new Promise(r=>release=r),page={className:'',setAttribute(k,v){this[k]=v}},content={innerHTML:'',appendChild(){}};
const document={title:'',getElementById:id=>id==='content'?content:null,querySelectorAll:()=>[],createElement:()=>page};
const navigation=vm.runInNewContext('({'+app.slice(start,end)+'})',{m:{currentModule:'dashboard'},xt:{state:{authenticated:true,locked:false},touch(){}},O:()=>({Pages:{test:async p=>{await gate;p.innerHTML='Ready'}}}),E:{beginCache:()=>1,endCache(){ended++}},document,window:{},console,setTimeout(){},i:{esc:String}});
navigation.toggleSidebar=()=>{};navigation.getPageMeta=()=>({title:'Test'});navigation.updateSidebarBadges=()=>{};
let settled=false;const navigating=navigation.navigate('test').then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);release();await navigating;assert.equal(page.innerHTML,'Ready');assert.equal(page['aria-busy'],'false');assert.equal(ended,1);
console.log('PASS: six theme/logo mappings, palette contrast, asynchronous navigation completion, invalid and blocked preference storage, exact offline assets, cache isolation, offline routes, 503 protection, failed-install protection.');
