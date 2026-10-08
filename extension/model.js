/* The same sanitized snapshot powers preview, editable Word and offline HTML. */
(() => {
 const style=e=>{try{return JSON.parse(e?.getAttribute('data-atw-style')||'{}');}catch{return {};}};
 function runs(node,inherited={},pre=false){if(node.nodeType===3){const text=pre?node.textContent:node.textContent.replace(/[\t\r\n ]+/g,' ');return text?[{text,...inherited}]:[];}if(node.nodeType!==1)return [];const tag=node.tagName.toLowerCase(),s={...inherited,...style(node)};s.underline=!!inherited.underline||!!s.underline;s.strike=!!inherited.strike||!!s.strike;
 if(tag==='br')return [{text:'\n',...s}];if(tag==='img')return [{image:node.getAttribute('data-atw-resource'),alt:node.alt,...s}];if(tag==='sup')s.superScript=true;if(tag==='sub')s.subScript=true;if(tag==='code'||tag==='kbd'||tag==='samp')s.code=true;if(['strong','b'].includes(tag))s.bold=true;if(['em','i'].includes(tag))s.italics=true;if(tag==='a'){const u=node.getAttribute('href');if(u)s.link=u;}
 return [...node.childNodes].flatMap(n=>runs(n,s,pre||tag==='pre'||/^pre/.test(s.whiteSpace||'')));}
 function blocks(container,context={}){const out=[];let pending=[];const flush=()=>{if(pending.some(r=>r.image||r.text?.trim()))out.push({type:context.type||'p',style:{...style(container),...(['TD','TH'].includes(container.tagName)?{border:{}}:{})},...context,runs:pending});pending=[];};
 for(const node of container.childNodes){if(node.nodeType!==1){pending.push(...runs(node,style(container),context.type==='pre'));continue;}const tag=node.tagName.toLowerCase();if(tag==='table'){flush();const rows=[...node.rows].map(row=>({cells:[...row.cells].map(cell=>({colSpan:cell.colSpan,rowSpan:cell.rowSpan,style:style(cell),blocks:blocks(cell),header:cell.tagName==='TH'}))}));out.push({type:'table',rows,style:style(node)});}
 else if(tag==='ul'||tag==='ol'){flush();let n=Number(node.getAttribute('start'))||(node.hasAttribute('reversed')?node.children.length:1);const depth=context.listDepth||0;for(const li of node.children){if(li.tagName!=='LI')continue;if(li.hasAttribute('value'))n=Number(li.getAttribute('value'));const marker=tag==='ol'?String(n)+'.':depth%2?'◦':'•';const list=blocks(li,{listDepth:depth+1});if(list.length){list[0].marker=marker;list[0].listDepth=depth+1;}out.push(...list);n+=node.hasAttribute('reversed')?-1:1;}}
 else if(tag==='pre'){flush();out.push({type:'pre',style:style(node),...context,runs:runs(node,{},true)});}
 else if(tag==='hr'){flush();out.push({type:'hr',style:style(node)});}
 else if(['div','section','article','blockquote','figure','details','dl'].includes(tag)){flush();out.push(...blocks(node,{...context,quote:context.quote||tag==='blockquote',quoteStyle:tag==='blockquote'?style(node):context.quoteStyle}));}
 else if(/^(p|h[1-6]|figcaption|dt|dd|summary)$/.test(tag)){flush();out.push({type:tag,style:style(node),...context,runs:runs(node)});}
 else pending.push(...runs(node,style(container),context.type==='pre'));
 }flush();return out;}
 globalThis.articleBlocks=a=>blocks(new DOMParser().parseFromString(a.html,'text/html').body);

})();
