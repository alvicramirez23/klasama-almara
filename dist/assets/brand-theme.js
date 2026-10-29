(()=>{
 const valid=new Set(['light','sepia','dark','navy','deped-green','noir']);
 function update(){
  const current=document.documentElement.getAttribute('data-theme')||'light',theme=valid.has(current)?current:'light';
  document.querySelectorAll('img[data-klasama-brand],img[src*="klasama-mark.svg"]').forEach(img=>{
   img.dataset.klasamaBrand='true';
   const variant=theme==='dark'||img.closest('.auth-brand,.klasama-notebook,.loader-core')?'white':theme;
   const src='./assets/klasama-mark-'+variant+'.svg';
   if(img.getAttribute('src')!==src)img.setAttribute('src',src);
  });
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(link=>link.setAttribute('href','./assets/klasama-app-icon.svg'));
 }
 update();new MutationObserver(update).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-theme']});
})();
