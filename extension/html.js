/* Sanitize and resolve resources through DOM attributes, preserving article text. */
(() => {
  const CSP="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; media-src data:; frame-src 'self' about: data:; form-action 'none'; base-uri 'none'";
  globalThis.buildOfflinePage=function(page,assets,extraFonts=''){
    const resources=new Map(page.resources.map(r=>['atw-resource:'+r.id,assets.get(r.id)?.data||'data:application/octet-stream;base64,']));
    const replace=value=>value.replace(/atw-resource:asset-\d+(?![\w-])/g,token=>resources.get(token)||'data:application/octet-stream;base64,');
    function sanitize(html,depth=0){
      if(depth>8)throw Error('嵌入页面层级过深，请检查原网页');
      const doc=new DOMParser().parseFromString(html,'text/html');
      for(const el of doc.querySelectorAll('script,link,base,object,embed,meta[http-equiv]'))el.remove();
      if(depth===0&&extraFonts){const style=doc.createElement('style');style.textContent=extraFonts;doc.head.append(style);}
      for(const el of doc.querySelectorAll('*')){
        for(const attr of [...el.attributes]){
          const key=attr.name.toLowerCase();
          if(/^on/.test(key)||['ping','action','formaction','srcset'].includes(key)){el.removeAttribute(attr.name);continue;}
          if(['src','href','xlink:href','poster','data'].includes(key)){
            const normalized=attr.value.replace(/[\u0000-\u0020\u007f]/g,'');
            if(/^(javascript|vbscript):/i.test(normalized)){el.removeAttribute(attr.name);continue;}
          }
          if(key!=='srcdoc'&&key!=='id'&&key!=='class'&&key!=='title'&&key!=='alt'&&!key.startsWith('data-'))el.setAttribute(attr.name,replace(attr.value));
        }
        if(el.tagName==='STYLE')el.textContent=replace(el.textContent).replace(/</g,'\\3c ');
        if(el.tagName==='IFRAME'){
          el.setAttribute('sandbox','');el.removeAttribute('src');
          if(el.hasAttribute('srcdoc'))el.setAttribute('srcdoc',sanitize(el.getAttribute('srcdoc'),depth+1));
        }
        if(el.tagName==='FORM'){el.removeAttribute('action');el.removeAttribute('method');}
      }
      const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content=CSP;doc.head.prepend(csp);
      return '<!doctype html>\n'+doc.documentElement.outerHTML;
    }
    return sanitize(page.html);
  };
})();
