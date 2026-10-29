/* Remove example hints without touching values or saved records. */
(()=>{
 const fields='input,textarea,select';
 function update(el){
  if(!el.matches?.(fields))return;
  el.removeAttribute('placeholder');
  if(el.type==='hidden'||(el.getAttribute('aria-label')&&!['Text input','Select option'].includes(el.getAttribute('aria-label')))||el.getAttribute('aria-labelledby')||el.labels?.length)return;
  const group=el.closest('.form-group,.field,.form-field');
  const label=group?.querySelector('label')?.textContent?.trim();
  const id=(el.id||el.name||'').replace(/[-_]/g,' ').trim();
  const row=el.closest('tr');
  const learner=row?.querySelector('a')?.textContent?.trim();
  const fallback=el.type==='checkbox'?(learner?'Select learner '+learner:row?.querySelector('th')?'Select all learners':'Select item'):el.type==='radio'?'Choose option':/search|filter/i.test(id)?'Search '+id.replace(/search|filter/ig,'').trim():id||'Text input';
  const name=label||fallback;
  el.setAttribute('aria-label',name);
 }
 function scan(root){update(root);root.querySelectorAll?.(fields).forEach(update)}
 scan(document);
 new MutationObserver(changes=>{for(const change of changes){if(change.type==='attributes')update(change.target);else for(const node of change.addedNodes)if(node.nodeType===1)scan(node)}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['placeholder']});
})();
