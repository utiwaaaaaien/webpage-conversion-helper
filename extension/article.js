/* Locate original article nodes; retain the live DOM's styles and geometry. */
(() => {
  const visible = e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  globalThis.findArticleElements = function () {
    const live = [...document.querySelectorAll('*')];
    const copy = document.cloneNode(true), map = new Map();
    [...copy.querySelectorAll('*')].forEach((e,i) => { e.setAttribute('data-atw-original',String(i)); map.set(String(i),live[i]); });
    let parsed;
    try { parsed = new Readability(copy,{keepClasses:true,serializer:e=>e}).parse(); } catch {}
    let root = document.querySelector('#js_content');
    if (!visible(root)) root = null;
    if (!root && location.hostname === 'km.woa.com') root = [...document.querySelectorAll('.km-article-json-content,.teditor-json-content,.km-article-content')].filter(visible).sort((a,b)=>b.innerText.length-a.innerText.length)[0];
    if(!root){const explicit=[...document.querySelectorAll('article,[itemprop=articleBody]')].filter(e=>visible(e)&&e.innerText.trim().length>100);if(explicit.length===1)root=explicit[0];}
    if (!root) {
      const mapped = [...(parsed?.content?.querySelectorAll('[data-atw-original]') || [])].map(e=>map.get(e.getAttribute('data-atw-original'))).filter(e=>visible(e) && (/^(P|PRE|BLOCKQUOTE|H[1-6]|TABLE|UL|OL|FIGURE)$/.test(e.tagName) && e.textContent.trim().length > 30 || e.tagName === 'IMG'));
      if (mapped.length) {
        root = mapped[0];
        while (root && !mapped.every(e=>root.contains(e))) root=root.parentElement;
        if (root === document.body || root === document.documentElement) root = null;
      }
    }
    if (!root) root = [...document.querySelectorAll('article,main,[role="main"]')].filter(e=>visible(e)&&e.innerText.trim().length>100).sort((a,b)=>b.innerText.length-a.innerText.length)[0];
    if (!root || !root.innerText.trim() && !root.querySelector('img,svg,canvas')) throw Error('未能明确识别文章正文，请使用完整 HTML 保存。');
    const title = document.querySelector('#activity-name')?.textContent.trim() || (location.hostname==='km.woa.com'?document.title.split(' - ')[0]:parsed?.title||document.title);
    const titleNode = live.filter(e=>visible(e)&&!['TITLE','SCRIPT','STYLE'].includes(e.tagName)&&e.textContent.trim()===title).sort((a,b)=>parseFloat(getComputedStyle(b).fontSize)-parseFloat(getComputedStyle(a).fontSize))[0];
    const leadNodes = location.hostname==='km.woa.com'?[...document.querySelectorAll('.lead-words')].filter(e=>visible(e)&&!root.contains(e)):[];
    return {root,title,titleNode,leadNodes};
  };
})();
