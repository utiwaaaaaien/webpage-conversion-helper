/* Render a cached article in an inert local frame. Never execute archived code. */
(() => {
  const canonical = value => {
    const u=new URL(value);u.hash='';u.pathname=u.pathname.replace(/\/$/,'');return u.href;
  };
  globalThis.prepareEmbeddedArticle = async function(archive,hint){
    const matches=archive.documents.filter(d=>{try{return canonical(d.location)===canonical(hint.frameURL);}catch{return false;}});
    if(matches.length!==1)throw Error('浏览器归档中未找到唯一的嵌入正文。请先点击“加载全部网页”，再重新转换。');
    const source=matches[0],doc=new DOMParser().parseFromString(source.text,'text/html'),warnings=[];
    if(doc.querySelectorAll('*').length>30000)throw Error('嵌入正文元素过多');
    const resolve=(value,base=source.location)=>{
      if(!value||value.startsWith('#')||value.startsWith('data:'))return value;
      try{return new URL(value,base).href;}catch{return '';}
    };
    const cached=(value,base)=>archive.resources.get(value)||archive.resources.get(resolve(value,base));
    let characters=0;
    async function css(text,base,chain=[]){
      characters+=text.length;if(characters>48*1024*1024)throw Error('嵌入正文样式过大');
      const imports=[...text.matchAll(/@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)|"([^"]*)"|'([^']*)')\s*([^;]*);/gi)];
      for(const m of imports){
        const value=m[1]??m[2]??m[3]??m[4]??m[5],item=cached(value,base),key=resolve(value,base);
        let replacement='';
        if(item&&/^text\/css/i.test(item.type)&&chain.length<8&&!chain.includes(key)){
          replacement=await css(await (await fetch(item.data)).text(),item.location||base,[...chain,key]);
          if(m[6].trim())replacement='@media '+m[6].trim()+'{'+replacement+'}';
        }else warnings.push('一个嵌入样式来源未能保存');
        text=text.replace(m[0],replacement);
      }
      // Unparsed imports are blocked by CSP, including malformed or newer syntax.
      text=text.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,(all,a,b,c)=>{
        const value=(a??b??c??'').trim();
        if(value.startsWith('#')||value.startsWith('data:'))return all;
        const item=cached(value,base);
        if(!item)warnings.push('一个嵌入图片或字体未能保存');
        return 'url("'+(item?.data||'data:application/octet-stream;base64,')+'")';
      });
      return text.replace(/</g,'\\3c ');
    }
    // Remove active elements before attaching anything to a live document.
    doc.querySelectorAll('script,noscript,base,object,embed,meta[http-equiv],iframe').forEach(e=>e.remove());
    for(const link of [...doc.querySelectorAll('link')]){
      if(link.relList.contains('stylesheet')){
        const item=cached(link.getAttribute('href'),source.location);
        if(item&&/^text\/css/i.test(item.type)){
          const style=doc.createElement('style');
          style.textContent=await css(await (await fetch(item.data)).text(),item.location||source.location);
          if(link.media)style.media=link.media;link.replaceWith(style);continue;
        }
        warnings.push('一个嵌入样式来源未能保存');
      }
      link.remove();
    }
    let missingImages=0;
    for(const el of doc.querySelectorAll('*')){
      for(const attr of [...el.attributes])if(/^on/i.test(attr.name)||['action','formaction','ping','srcset','autofocus','nonce'].includes(attr.name.toLowerCase()))el.removeAttribute(attr.name);
      if(el.hasAttribute('style'))el.setAttribute('style',await css(el.getAttribute('style'),source.location));
      if(el.tagName==='STYLE')el.textContent=await css(el.textContent,source.location);
      for(const attr of ['src','poster','xlink:href',...(el.tagName==='image'||el.tagName==='use'?['href']:[])]){
        if(!el.hasAttribute(attr))continue;
        const value=el.getAttribute(attr),item=cached(value,source.location);
        if(value.startsWith('#')||/^data:image\//i.test(value))continue;
        if(item&&!/^text\/html/i.test(item.type))el.setAttribute(attr,item.data);
        else {el.removeAttribute(attr);if(el.tagName==='IMG')missingImages++;}
      }
      if(el.tagName==='A'){
        const href=resolve(el.getAttribute('href'));
        if(/^https?:|^#/i.test(href||''))el.setAttribute('href',href);else el.removeAttribute('href');
      }
    }
    if(missingImages)throw Error('嵌入正文中有 '+missingImages+' 张图片尚未加载，请先加载全部网页再转换。');
    // Extension documents have a smaller UA body font than ordinary webpages.
    // Supply webpage defaults before author CSS so inherited sizes remain faithful.
    const defaults=doc.createElement('style');defaults.textContent='html{font-size:16px;font-family:"Times New Roman"}body{font-size:inherit;color:#000}';doc.head.prepend(defaults);
    const html=buildOfflinePage({html:doc.documentElement.outerHTML,resources:[]},new Map());
    if(html.length>64*1024*1024)throw Error('嵌入正文内容过大');
    return {html,warnings:[...new Set(warnings)]};
  };
  globalThis.renderEmbeddedArticle = async function(html,hint){
    const frame=document.createElement('iframe');
    frame.setAttribute('sandbox','allow-same-origin'); // Scripts and navigation remain disabled.
    frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    frame.style.cssText='position:fixed;left:-30000px;top:0;border:0;pointer-events:none;width:'+Math.max(320,Math.min(20000,hint.width))+'px;height:'+Math.max(600,Math.min(200000,hint.height))+'px';
    try{
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('嵌入正文预览读取超时')),15000);
        frame.onload=()=>{clearTimeout(timer);resolve();};frame.srcdoc=html;document.body.append(frame);
      });
      const doc=frame.contentDocument;
      if(!doc?.body)throw Error('嵌入正文无法读取');
      await Promise.race([Promise.all([doc.fonts.ready,...[...doc.images].map(img=>img.decode().catch(()=>{}))]),new Promise(r=>setTimeout(r,5000))]);
      if([...doc.images].some(img=>!img.complete||!img.naturalWidth))throw Error('嵌入正文图片无法显示，请重新加载网页');
      return frame;
    }catch(e){frame.remove();throw e;}
  };
})();
