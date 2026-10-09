/* Locate live article nodes before cleaning; embedded bodies are handled separately. */
(() => {
  const visible = e => e && e.getClientRects().length && e.ownerDocument.defaultView.getComputedStyle(e).display !== 'none' && e.ownerDocument.defaultView.getComputedStyle(e).visibility !== 'hidden';
  const content = e => visible(e) && (e.innerText.trim().length > 100 || [...e.querySelectorAll('img,svg,canvas')].some(visible));
  globalThis.findEmbeddedArticle = function (document=globalThis.document,sourceURL=document.URL) {
    const location=new URL(sourceURL);
    const frames = [...document.querySelectorAll('iframe')].filter(visible).filter(e => {
      const u = new URL(e.src || 'about:blank', location.href);
      if (!/^https?:$/.test(u.protocol)) return false;
      if (location.hostname === 'km.woa.com' && e.closest('.iframe-body') && u.hostname === 'html.woa.com' && /^\/km\/post\/\d+\/?$/.test(u.pathname)) return true;
      const host = e.closest('article,[itemprop=articleBody],main,[role=main]');
      const rect=e.getBoundingClientRect();
      return host && host.innerText.trim().length < 100 && rect.width >= 400 && rect.height >= 600 && !/youtube|youtu\.be|vimeo|player|video/i.test(u.hostname + u.pathname);
    });
    if (frames.length > 1) throw Error('发现多个嵌入正文，无法确定文章范围，请使用完整 HTML 保存。');
    if (!frames.length){
      if(location.hostname==='km.woa.com'&&[...document.querySelectorAll('.iframe-body')].some(visible))throw Error('嵌入正文尚未加载，请先加载全部网页再转换。');
      return null;
    }
    const e=frames[0], rect=e.getBoundingClientRect();
    const leads=[...document.querySelectorAll('.lead-words')].filter(visible).map(source=>{
      if(source.querySelectorAll('*').length>1000||source.textContent.length>1024*1024)throw Error('文章导语过大，请检查网页');
      const copy=source.cloneNode(true),a=[source,...source.querySelectorAll('*')],b=[copy,...copy.querySelectorAll('*')];
      a.forEach((node,i)=>{const style=getComputedStyle(node);for(const key of ['font-family','font-size','font-weight','font-style','line-height','color','background-color','text-align','margin','padding','border','white-space'])b[i].style.setProperty(key,style.getPropertyValue(key));});
      return copy.outerHTML;
    }).join('');
    return {leadHTML:leads,url:location.href,frameURL:e.src,width:Math.ceil(rect.width),height:Math.ceil(rect.height),title:document.title.split(' - ')[0]};
  };
  globalThis.findArticleElements = function (doc = document, sourceURL = doc.URL) {
    const host = new URL(sourceURL).hostname, live = [...doc.querySelectorAll('*')];
    let parsed, root;
    const known=[...doc.querySelectorAll(host==='km.woa.com'?'#js_content,.km-article-json-content,.teditor-json-content,.km-article-content':'#js_content')].filter(content);
    root=known.sort((a,b)=>b.innerText.length-a.innerText.length)[0];
    if(!root){const explicit=[...doc.querySelectorAll('article,[itemprop=articleBody]')].filter(content);if(explicit.length===1)root=explicit[0];}
    if(!root){const main=[...doc.querySelectorAll('main,[role=main]')].filter(content);if(main.length===1)root=main[0];}
    if (!root) {
      const copy = doc.cloneNode(true), map = new Map();
      [...copy.querySelectorAll('*')].forEach((e,i) => { e.setAttribute('data-atw-original',String(i)); map.set(String(i),live[i]); });
      try { parsed = new Readability(copy,{keepClasses:true,serializer:e=>e}).parse(); } catch {}
      const mapped = [...(parsed?.content?.querySelectorAll('[data-atw-original]') || [])].map(e=>map.get(e.getAttribute('data-atw-original'))).filter(e=>visible(e) && (/^(P|PRE|BLOCKQUOTE|H[1-6]|TABLE|UL|OL|FIGURE)$/.test(e.tagName) && e.textContent.trim().length > 30 || e.tagName === 'IMG'));
      if (mapped.length) {
        root = mapped[0];
        while (root && !mapped.every(e=>root.contains(e))) root=root.parentElement;
        if (root === doc.body || root === doc.documentElement) root = null;
      }
    }
    if (!root) root = [...doc.querySelectorAll('article,main,[role="main"]')].filter(content).sort((a,b)=>b.innerText.length-a.innerText.length)[0];
    if (!content(root)) throw Error('未能明确识别文章正文，请等待正文加载或使用完整 HTML 保存。');
    const title = doc.querySelector('#activity-name')?.textContent.trim() || (host==='km.woa.com'?doc.title.split(' - ')[0]:parsed?.title||root.querySelector('h1')?.textContent.trim()||doc.title);
    const titleNode = live.filter(e=>visible(e)&&!['TITLE','SCRIPT','STYLE'].includes(e.tagName)&&e.textContent.trim()===title).sort((a,b)=>parseFloat(doc.defaultView.getComputedStyle(b).fontSize)-parseFloat(doc.defaultView.getComputedStyle(a).fontSize))[0];
    const leadNodes = host==='km.woa.com'?[...doc.querySelectorAll('.lead-words')].filter(e=>visible(e)&&!root.contains(e)):[];
    return {root,title,titleNode,leadNodes,byline:doc.querySelector('#js_name')?.textContent.trim()||parsed?.byline||''};
  };
})();
