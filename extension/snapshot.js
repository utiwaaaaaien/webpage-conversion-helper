/* Static, self-contained snapshot of the rendered page. No page scripts are exported. */
(() => {
  const sessions = globalThis.__atwPageSessions || (globalThis.__atwPageSessions = new Map());
  const MAX_ASSET = 30 * 1024 * 1024;
  const blobData = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error('资源读取失败'));
    reader.readAsDataURL(blob);
  });
  globalThis.capturePage = async function (mode = 'full', context = {}) {
    const document=context.document||globalThis.document, location=new URL(context.url||document.URL);
    const innerWidth=document.defaultView.innerWidth, innerHeight=document.defaultView.innerHeight;
    const getComputedStyle=(node,pseudo)=>node.ownerDocument.defaultView.getComputedStyle(node,pseudo);
    const captureURL=location.href;
    let budget=performance.now(),visited=0;
    async function checkpoint(){
      if(++visited>30000)throw Error('页面元素过多，请使用正文 HTML 或缩小页面后重试');
      if(performance.now()-budget>12){await (globalThis.scheduler?.yield ? scheduler.yield() : new Promise(r=>setTimeout(r,0)));budget=performance.now();}
      if(!context.document&&globalThis.location.href!==captureURL)throw Error('原网页已切换，请重新转换');
    }
    const article = mode === 'article' ? globalThis.findArticleElements(document,location.href) : null;
    if(article && context.title)article.title=context.title;
    await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]);
    const resources = [], nodes = new Map(), warnings = [], urlIds = new Map();
    const snapshot = crypto.randomUUID();
    const sharedStyles = new Map(), fontRules = [], sheets = new Set(), usedFonts = new Set();
    let seq = 0, cssCharacters=0;
    const sharedCSS=()=>[...sharedStyles.values()].map(({id,css,pseudo})=>'['+(pseudo==='::before'?'data-atw-before':pseudo==='::after'?'data-atw-after':'data-atw-css')+'="'+id+'"]'+pseudo+'{'+css+'}').join('\n');
    function asset(value, kind = 'asset', node) {
      if (!value || !String(value).trim()) return '';
      let url;
      try { url = new URL(value, location.href).href; } catch { return ''; }
      if (!/^(https?:|blob:|data:)/.test(url)) return '';
      if (url.startsWith('data:')) return url;
      if (!urlIds.has(url)) {
        const id = 'asset-' + resources.length;
        urlIds.set(url, id);
        resources.push({id, url, kind});
        nodes.set(id, {node, url, kind});
      } else if (node && !nodes.get(urlIds.get(url)).node) nodes.get(urlIds.get(url)).node = node;
      return 'atw-resource:' + urlIds.get(url);
    }
    function urls(css, base = location.href) {
      return css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (all, a, b, c) => {
        const value = (a ?? b ?? c ?? '').trim();
        if (value.startsWith('#') || value.startsWith('data:')) return all;
        try { return 'url("' + asset(new URL(value, base).href) + '")'; } catch { return 'none'; }
      });
    }
    function style(source, target, pseudo) {
      const computed = getComputedStyle(source, pseudo), declaration = document.createElement('span').style;
      for (const font of computed.fontFamily.split(",")) usedFonts.add(font.trim().replace(/^[\'"]|[\'"]$/g, "").toLowerCase());
      for (const key of computed) {
        if (key.startsWith('--') || key === 'animation' || key.startsWith('animation-') || key === 'transition' || key.startsWith('transition-')) continue;
        const raw = computed.getPropertyValue(key);
        const value = urls(raw);
        declaration.setProperty(key, value, 'important');
      }
      if (target) {
        declaration.setProperty('animation', 'none', 'important');
        declaration.setProperty('transition', 'none', 'important');
        declaration.setProperty('content-visibility', 'visible', 'important');
      }
      const css=declaration.cssText;
      // A nested document cannot inherit the outer snapshot's stylesheet.
      if(source.ownerDocument!==document && target){
        cssCharacters+=css.length;target.style.cssText=css;
      }else{
        const key=(pseudo||'')+'\n'+css;
        if(!sharedStyles.has(key)){
          sharedStyles.set(key,{id:String(sharedStyles.size),css,pseudo:pseudo||''});
          cssCharacters+=css.length+80;
        }
        const entry=sharedStyles.get(key);
        if(target)target.setAttribute('data-atw-css',entry.id);
        if(cssCharacters>48*1024*1024)throw Error('页面独立样式过多，请缩小页面范围后重试');
        return entry.id;
      }
      if(cssCharacters>48*1024*1024)throw Error('页面独立样式过多，请缩小页面范围后重试');
    }
    function stylesheet(sheet) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.FONT_FACE_RULE) fontRules.push({text:rule.cssText,family:rule.style.fontFamily,base:sheet.href || location.href});
          else if (rule.styleSheet) stylesheet(rule.styleSheet);
          else if (rule.cssRules) for (const inner of rule.cssRules) if (inner.type === CSSRule.FONT_FACE_RULE) fontRules.push({text:inner.cssText,family:inner.style.fontFamily,base:sheet.href || location.href});
        }
      } catch { if (sheet.href) sheets.add(sheet.href); }
    }
    for (const sheet of document.styleSheets) stylesheet(sheet);
    for (const sheet of document.adoptedStyleSheets || []) stylesheet(sheet);
    async function clone(source) {
      await checkpoint();
      if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent);
      if (source.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = source.localName;
      if (article && source !== article.root && source !== article.titleNode && source.matches('nav,aside,button,form,[role=dialog],[role=navigation],.related-articles,.recommended-articles,.recommend-list,.article-actions,.share-tools,.comment-list,#js_pc_qr_code,#js_related_container')) return null;
      const visibility = getComputedStyle(source);
      if (!['html','head','body'].includes(tag) && (visibility.display === 'none' || visibility.visibility === 'hidden')) return null;
      if (['script','noscript','style','link','base','meta'].includes(tag)) return null;
      let target;
      if (tag === 'canvas') {
        target = document.createElement('img');
        try { target.src = source.toDataURL('image/png'); } catch { warnings.push('受保护的画布无法保存'); target.alt = '[画布未能保存]'; }
      } else if (tag === 'iframe') {
        target = source.cloneNode(false);
        target.removeAttribute('src'); target.removeAttribute('srcdoc');
        target.setAttribute('sandbox', '');
        try {
          if (!source.contentDocument?.documentElement) throw Error();
          const inner = await clone(source.contentDocument.documentElement);
          const innerStyles=source.contentDocument.createElement('style');
          innerStyles.textContent=sharedCSS().replace(/</g,'\\3c ');
          inner.querySelector('head')?.append(innerStyles);
          target.srcdoc = '<!doctype html>' + inner.outerHTML;
        } catch(e) { if(e?.message)throw e;warnings.push('跨域嵌入页面无法离线复刻'); target.srcdoc = '<p>嵌入内容请在原网页查看</p>'; }
      } else target = source.cloneNode(false);
      for (const attr of [...target.attributes]) {
        if (['data-atw-css','data-atw-before','data-atw-after'].includes(attr.name)) target.removeAttribute(attr.name);
        if (/^on/i.test(attr.name) || ['nonce','integrity','crossorigin','autofocus','contenteditable','srcset','sizes','ping','action','formaction','srcdoc'].includes(attr.name) && tag !== 'iframe') target.removeAttribute(attr.name);
        if (['src','href','xlink:href'].includes(attr.name) && /^\s*javascript:/i.test(attr.value)) target.removeAttribute(attr.name);
      }
      target.removeAttribute('style');
      style(source, target);
      const id = String(seq++);
      target.setAttribute('data-atw-node', id);
      for (const pseudo of ['::before','::after']) {
        const s = getComputedStyle(source, pseudo);
        if (s.content && !['none','normal'].includes(s.content)) target.setAttribute(pseudo==='::before'?'data-atw-before':'data-atw-after',style(source,null,pseudo));
      }
      if (tag === 'img') {
        const src = source.currentSrc || source.getAttribute('src') || source.getAttribute('data-src') || source.getAttribute('data-original');
        target.setAttribute('src', asset(src, 'image', source));
        target.removeAttribute('loading'); target.removeAttribute('srcset'); target.removeAttribute('sizes');
      }
      if (tag === 'image' || tag === 'use') {
        const href = source.getAttribute('href') || source.getAttribute('xlink:href');
        if (href && !href.startsWith('#')) target.setAttribute('href', asset(href, 'image', source));
      }
      if (tag === 'video') {
        const poster = source.poster;
        if (poster) target.setAttribute('poster', asset(poster, 'image'));
        target.removeAttribute('src'); target.removeAttribute('autoplay');
        warnings.push('视频保存封面，播放需打开原网页');
      }
      if (tag === 'audio' || tag === 'source' || tag === 'track' || tag === 'embed' || tag === 'object') {
        target.removeAttribute('src'); target.removeAttribute('data');
      }
      if (tag === 'a') {
        const href = source.getAttribute('href');
        if (href && !href.startsWith('#') && /^https?:/.test(source.href)) target.setAttribute('href', source.href);
        target.setAttribute('rel','noopener noreferrer');
      }
      if (tag === 'input') {
        if (['password','file'].includes(source.type)) target.removeAttribute('value');
        else target.setAttribute('value', source.value);
        if (source.checked) target.setAttribute('checked',''); else target.removeAttribute('checked');
      }
      if (tag === 'textarea') target.textContent = source.value;
      else if (tag === 'select') {
        for (const child of source.childNodes) { const copy = await clone(child); if (copy) target.append(copy); }
        [...target.options].forEach((o,i) => { if (source.options[i].selected) o.setAttribute('selected',''); else o.removeAttribute('selected'); });
      } else if (!['canvas','iframe'].includes(tag)) {
        const children = source.shadowRoot ? source.shadowRoot.childNodes : source.childNodes;
        if (source.shadowRoot) {
          for (const sheet of source.shadowRoot.adoptedStyleSheets || []) stylesheet(sheet);
          for (const e of source.shadowRoot.querySelectorAll('style')) if (e.sheet) stylesheet(e.sheet);
        }
        for (const child of children) {
          if (child.localName === 'slot') {
            for (const assigned of child.assignedNodes({flatten:true})) { const copy = await clone(assigned); if (copy) target.append(copy); }
          } else { const copy = await clone(child); if (copy) target.append(copy); }
        }
      }
      // Preserve internal scroll containers at their saved position without scripts.
      if (!['html','body'].includes(tag) && (source.scrollTop || source.scrollLeft)) warnings.push('滚动容器在离线文件中从顶部显示');
      return target;
    }
    let root;
    let articleWidth;
    if (article) {
      root = document.createElement('html');root.lang=document.documentElement.lang||'zh-CN';
      const articleHead=document.createElement('head'), body=document.createElement('body');root.append(articleHead,body);
      articleWidth = Math.ceil(article.root.getBoundingClientRect().width);
      style(article.root,body);
      // Only article content is copied, without ancestor navigation or sidebars.
      body.style.cssText += ';position:static!important;display:block!important;width:'+articleWidth+'px!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:0!important;margin:0 auto!important;padding:0!important;border:0!important;transform:none!important;overflow:visible!important;box-sizing:border-box!important';
      let surface=article.root;
      while(surface && ['rgba(0, 0, 0, 0)','transparent'].includes(getComputedStyle(surface).backgroundColor)) surface=surface.parentElement;
      body.style.setProperty('background-color',surface?getComputedStyle(surface).backgroundColor:'#fff','important');
      const append = async (source,isRoot=false) => {
        const node=await clone(source);if(!node)return;
        node.style.setProperty('max-width','100%','important');node.style.setProperty('box-sizing','border-box','important');
        if(isRoot){node.style.setProperty('width',articleWidth+'px','important');node.style.setProperty('margin','0','important');node.style.setProperty('position','relative','important');node.style.setProperty('inset','auto','important');node.style.setProperty('transform','none','important');}
        body.append(node);
      };
      if(article.titleNode&&!article.root.contains(article.titleNode))await append(article.titleNode);
      for(const lead of article.leadNodes)await append(lead);
      await append(article.root,true);
    } else root = await clone(document.documentElement);
    const head = root.querySelector('head');
    head.replaceChildren();
    const charset = document.createElement('meta'); charset.setAttribute('charset','utf-8'); head.append(charset);
    const viewport = document.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width,initial-scale=1'; head.append(viewport);
    const title = document.createElement('title'); title.textContent = article?.title || document.title; head.append(title);
    const css = document.createElement('style'); const activeFonts=fontRules.filter(r=>usedFonts.has(r.family.replace(/^[\'"]|[\'"]$/g, '').toLowerCase())).map(r=>{
      const text=r.text.replace(/src\s*:[^;}]+/gi,src=>{const entries=src.match(/url\([^)]*\)(?:\s*format\([^)]*\))?/gi)||[];const choice=entries.find(x=>/woff2/i.test(x))||entries.find(x=>/woff/i.test(x))||entries[0];return choice?'src:'+choice:src;});
      return urls(text,r.base);
    });
    css.textContent = (activeFonts.join('\n') + '\n' + sharedCSS()).replace(/</g,'\\3c '); head.append(css);
    // Keep the original viewport width, avoiding unexpected reflow of the saved snapshot.
    root.style.setProperty('min-width', (articleWidth || innerWidth) + 'px', 'important');
    const html='<!doctype html>\n'+root.outerHTML;
    if(html.length>64*1024*1024)throw Error('页面内容过大，请使用正文 HTML 后重试');
    sessions.set(snapshot, nodes);
    while (sessions.size > 3) sessions.delete(sessions.keys().next().value);
    const originalImages=[...document.images].map(e=>[e.currentSrc,e.src,e.getAttribute("data-src"),e.getAttribute("data-original")].filter(Boolean).map(u=>new URL(u,location.href).href));
    return {snapshot, usedFonts:[...usedFonts], originalImages, title:article?.title || document.title, url:captureURL, mode, html, resources, stylesheets:[...sheets], warnings:[...new Set(warnings)], viewport:{width:articleWidth || innerWidth,height:innerHeight,contentWidth:articleWidth || document.documentElement.scrollWidth}};
  };
  globalThis.capturePageAsset = async function(snapshot, id) {
    const entry = sessions.get(snapshot)?.get(id);
    if (!entry) return {error:'原网页已刷新，请重新转换'};
    try {
      const response = await fetch(entry.url, {credentials:'include', signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw Error('HTTP ' + response.status);
      if (Number(response.headers.get('content-length')) > MAX_ASSET) throw Error('资源超过 30 MB');
      let blob;
      if(response.body){
        const reader=response.body.getReader(),chunks=[];let size=0;
        try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_ASSET){await reader.cancel();throw Error('资源超过 30 MB');}chunks.push(part.value);}}finally{reader.releaseLock();}
        blob=new Blob(chunks,{type:response.headers.get('content-type')||'application/octet-stream'});
      }else blob=await response.blob();
      if(blob.size>MAX_ASSET)throw Error('资源超过 30 MB');
      return {data:await blobData(blob)};
    } catch (e) {
      try {
        const node = entry.node;
        if (node?.naturalWidth) {
          const canvas = document.createElement('canvas');
          canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
          canvas.getContext('2d').drawImage(node,0,0);
          return {data:canvas.toDataURL('image/png')};
        }
      } catch {}
      return {error:e.message};
    }
  };
})();
