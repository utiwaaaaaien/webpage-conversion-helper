const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search);
const sourceTab = Number(query.get('tab'));
const kind = ['docx','html','article','pdf'].includes(query.get('format')) ? query.get('format') : 'docx';
const format = kind === 'docx' ? 'docx' : 'html';
let embeddedFrame, embeddedHint, page, nativeArchive, extraFonts = '', totalBytes = 0;
const assets = new Map(), fontRequests = new Map();
const MAX_TOTAL = 150 * 1024 * 1024, MAX_ASSET = 30 * 1024 * 1024;
// Run network reads in the webpage's own world as well. Some authenticated sites
// reject requests initiated by an extension's isolated world.
async function pageFetch(url, asText = false) {
  const [result] = await chrome.scripting.executeScript({target:{tabId:sourceTab},world:'MAIN',func:async (url, asText) => {
    try {
      const res = await fetch(url,{credentials:'include',signal:AbortSignal.timeout(12000)});
      if (!res.ok) throw Error('HTTP ' + res.status);
      const reader = res.body.getReader(), chunks = []; let size = 0;
      for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 30*1024*1024) { await reader.cancel(); throw Error('资源超过 30 MB'); } chunks.push(value); }
      const blob = new Blob(chunks,{type:res.headers.get('content-type') || 'application/octet-stream'});
      if (asText) return {text:await blob.text()};
      return {data:await new Promise((resolve,reject) => { const f = new FileReader(); f.onload=()=>resolve(f.result); f.onerror=()=>reject(Error('读取失败')); f.readAsDataURL(blob); })};
    } catch(e) { return {error:e.message}; }
  },args:[url,asText]});
  return result?.result || {error:'原网页未返回资源'};
}
const status = message => $('status').textContent = message;
const name = () => (page.title || '网页').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,100);
async function pool(list, fn) {
  let index = 0;
  await Promise.all(Array.from({length:Math.min(4,list.length)},async () => {
    while (index < list.length) { const item = list[index++]; await fn(item); }
  }));
}
function remember(id, result) {
  if (result?.data) {
    const size = result.data.length * .75;
    if (size > MAX_ASSET || totalBytes + size > MAX_TOTAL) result = {error:'资源超出大小限制'};
    else { if (!assets.get(id)?.data) totalBytes += size; }
  }
  assets.set(id,result || {error:'无法读取资源'});
}
async function fetchAsset(url) {
  const response = await fetch(url,{credentials:'include',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error('HTTP ' + response.status);
  if (Number(response.headers.get('content-length')) > MAX_ASSET) throw Error('资源超过 30 MB');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  for (;;) {
    const {done,value} = await reader.read(); if (done) break;
    size += value.length; if (size > MAX_ASSET) { await reader.cancel(); throw Error('资源超过 30 MB'); } chunks.push(value);
  }
  const blob = new Blob(chunks,{type:response.headers.get('content-type') || 'application/octet-stream'});
  return new Promise((resolve,reject) => { const f = new FileReader(); f.onload = () => resolve(f.result); f.onerror = () => reject(Error('资源读取失败')); f.readAsDataURL(blob); });
}
async function inSource(resource) {
  if(embeddedFrame)return format==='html'?capturePageAsset(page.snapshot,resource.id):captureArticleImage(page.snapshot,resource.id);
  if (format === 'html') {
    const [result] = await chrome.scripting.executeScript({target:{tabId:sourceTab},func:(s,id) => globalThis.capturePageAsset(s,id),args:[page.snapshot,resource.id]});
    return result?.result;
  }
  const [result] = await chrome.scripting.executeScript({target:{tabId:sourceTab},func:(s,id) => globalThis.captureArticleImage(s,id),args:[page.snapshot,resource.id]});
  return result?.result;
}
function resourceURLs(resource) { return format === 'html' ? [resource.url] : resource.urls; }
async function loadResource(resource, fromSource = true) {
  for (const url of resourceURLs(resource)) {
    const cached = nativeArchive?.resources.get(url);
    if (cached) { remember(resource.id,cached); if (assets.get(resource.id)?.data) return; }
  }
  if (fromSource) try { remember(resource.id,await inSource(resource)); } catch (e) { remember(resource.id,{error:e.message}); }
  if (assets.get(resource.id)?.data) return;
  for (const url of resourceURLs(resource)) {
    if (!/^https?:/.test(url)) continue;
    if (fromSource) {
      try { remember(resource.id,await pageFetch(url)); if (assets.get(resource.id)?.data) break; } catch (e) { remember(resource.id,{error:e.message}); }
    }
    if (!await chrome.permissions.contains({origins:[new URL(url).origin + '/*']})) continue;
    try { remember(resource.id,{data:await fetchAsset(url)}); if (assets.get(resource.id)?.data) break; } catch (e) { remember(resource.id,{error:e.message}); }
  }
}
// Cross-origin stylesheets are read only to recover font-face definitions.
async function loadFonts() {
  if (format !== 'html') return;
  const visited = new Set();
  async function sheet(url, depth = 0) {
    if (depth > 4 || visited.has(url)) return;
    visited.add(url);
    try {
      const cached = nativeArchive?.resources.get(url);
      const source = cached ? {text:await (await fetch(cached.data)).text()} : await pageFetch(url,true);
      let text = source.text;
      if (text === undefined) {
        if (!await chrome.permissions.contains({origins:[new URL(url).origin + '/*']})) { fontRequests.set(url,source.error); return; }
        const data = await fetchAsset(url); text = await (await fetch(data)).text();
      }
      const fontCSS = [...text.matchAll(/@font-face\s*\{[^}]*\}/gi)].map(m=>m[0]).filter(rule=>{const family=/font-family\s*:\s*([^;}]+)/i.exec(rule)?.[1]?.trim().replace(/^[\'"]|[\'"]$/g,'').toLowerCase();return family&&page.usedFonts.includes(family);}).map(rule=>rule.replace(/src\s*:[^;}]+/gi,src=>{const entries=src.match(/url\([^)]*\)(?:\s*format\([^)]*\))?/gi)||[];const choice=entries.find(x=>/woff2/i.test(x))||entries.find(x=>/woff/i.test(x))||entries[0];return choice?'src:'+choice:src;}));
      for (const rule of fontCSS) {
        const rewritten = rule.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,(all,a,b,c) => {
          const value = (a ?? b ?? c ?? '').trim(); if (value.startsWith('data:')) return all;
          const full = new URL(value,url).href;
          let r = page.resources.find(r => r.url === full);
          if (!r) { r = {id:'asset-' + page.resources.length,url:full,kind:'font'}; page.resources.push(r); }
          return 'url("atw-resource:' + r.id + '")';
        });
        if (!extraFonts.includes(rewritten)) extraFonts += rewritten + '\n';
      }
      for (const m of text.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/gi)) await sheet(new URL(m[1],url).href,depth + 1);
      fontRequests.delete(url);
    } catch (e) { fontRequests.set(url,e.message); }
  }
  for (const url of page.stylesheets || []) await sheet(url);
}
function missing() { return page.resources.filter(r => !assets.get(r.id)?.data); }
function details() {
  const bad = missing();
  $('details').textContent = (format === 'docx' ? 'Word 会按纸张宽度分页，保留正文格式和图片。' : (kind==='pdf'?'PDF 按网页尺寸生成，文字可选择和搜索；请在原生打印窗口中保存。':kind==='article'?'HTML 只保存已识别的文章正文，保留原文格式和图片。':'HTML 保存当前已加载的页面外观；动态交互需打开原网页。')) +
    (page.warnings?.length ? '\n' + page.warnings.join('\n') : '') +
    (bad.length ? '\n未保存资源：' + bad.length + '\n' + bad.slice(0,8).map(r => (resourceURLs(r)[0] || r.alt || r.id) + '（' + (assets.get(r.id)?.error || '未读取') + '）').join('\n') : '') +
    (fontRequests.size ? '\n有 ' + fontRequests.size + ' 个样式来源未能读取，网站字体可能使用本机替代。' : '');
}
function save(blob) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name() + (kind === 'article' ? ' - 正文' : '') + '.' + format; a.click();
  setTimeout(() => URL.revokeObjectURL(url),60000);
}
async function finish() {
  $('continue').hidden = true; $('save').hidden = true;
  try {
    status('正在生成文件…');
    if (format === 'docx') {
      const result = await buildDoc(page,{title:page.title,images:true,source:false},status,assets);
      save(result.blob);
      status('Word 已生成，请查看下载记录。\n图片：' + (page.resources.length - missing().length) + ' / ' + page.resources.length + ' 已保存。' + (result.failed ? '\n' + result.failed + ' 张图片未能写入 Word。' : ''));
    } else {
      const html=buildOfflinePage(page,assets,extraFonts);
      if(kind==='pdf'){await openWebPDF(page,html);status('PDF 预览已打开，请在打印窗口中保存为 PDF。');details();return;}
      save(new Blob([html],{type:'text/html;charset=utf-8'}));
      status((kind==='article'?'正文 HTML':'完整 HTML 网页')+' 已生成，请查看下载记录。\n资源：' + (page.resources.length - missing().length) + ' / ' + page.resources.length + ' 已保存。'+(page.embeddedImages?'\n嵌入正文配图：'+page.embeddedImages+' 张已内嵌。':''));
    }
    details();
  } catch (e) { status('转换失败：' + e.message + '\n请回到原网页重新转换。'); }
}
function offer() {
  details();
  if (!missing().length && !fontRequests.size) return finish();
  status('已读取页面，有部分资源尚未保存。');
  $('continue').hidden = false;
  $('continue').textContent = '读取浏览器已加载资源并继续';
  $('save').hidden = false;
}
$('continue').onclick = async () => {
  $('continue').disabled = true; $('save').hidden = true;
  try {
    if($('continue').dataset.phase==='embedded'){
      if(await chrome.permissions.request({permissions:['pageCapture']}))await convertEmbedded();
      else status('未获得正文读取权限，未生成不完整文章。');
      return;
    }
    // Native capture is an optional permission, requested only on this button.
    if($('continue').dataset.phase==='hosts'){
      const origins=[...new Set([...missing().flatMap(resourceURLs),...fontRequests.keys()].filter(u=>/^https?:/.test(u)).map(u=>new URL(u).origin+'/*'))];
      if(await chrome.permissions.request({origins})){
        await loadFonts();await pool(missing(),r=>loadResource(r,false));
        if(missing().length||fontRequests.size){status('仍有资源未能保存，请查看下方详情。可以重试，或保存已读取的内容。');details();$('save').hidden=false;}
        else await finish();
      }
      else{status('未获得补全资源权限。可以保存已读取的内容。');$('save').hidden=false;}
      return;
    }
    const allowed = await chrome.permissions.request({permissions:['pageCapture']});
    if (allowed) {
      status('正在读取浏览器已加载的图片和样式…');
      nativeArchive = await captureNativeArchive(sourceTab,page);
      await loadFonts();
      await pool(missing(),r => loadResource(r,false));
      const origins=[...new Set([...missing().flatMap(resourceURLs),...fontRequests.keys()].filter(u=>/^https?:/.test(u)).map(u=>new URL(u).origin+'/*'))];
      if(origins.length){
        status('浏览器归档已读取，仍有图片或字体需要从原网站补全。');
        details();$('continue').hidden=false;$('continue').textContent='补全缺失图片和字体';$('continue').dataset.phase='hosts';$('save').hidden=false;
      }else await finish();
    } else { status('未获得资源读取权限。可以保存已读取的内容。'); $('save').hidden = false; }
  } catch (e) { status('资源补全失败：' + e.message); $('save').hidden = !page; }
  finally { $('continue').disabled = false; }
};
$('save').onclick = finish;
async function convertEmbedded(){
  try{
    status('正在读取嵌入正文、样式和配图…');
    nativeArchive=await captureNativeArchive(sourceTab,embeddedHint);
    const prepared=await prepareEmbeddedArticle(nativeArchive,embeddedHint);
    embeddedFrame=await renderEmbeddedArticle(prepared.html,embeddedHint);
    if(embeddedHint.leadHTML){
      const safe=buildOfflinePage({html:'<body>'+embeddedHint.leadHTML+'</body>',resources:[]},new Map());
      const leadDoc=new DOMParser().parseFromString(safe,'text/html');
      const root=findArticleElements(embeddedFrame.contentDocument,embeddedHint.frameURL).root;
      root.prepend(...[...leadDoc.body.childNodes].map(node=>embeddedFrame.contentDocument.importNode(node,true)));
    }
    const context={document:embeddedFrame.contentDocument,url:embeddedHint.frameURL,title:embeddedHint.title};
    page=format==='docx'?extractArticle(context):await capturePage('article',context);
    page.url=embeddedHint.url;page.title=embeddedHint.title;page.embeddedImages=embeddedFrame.contentDocument.querySelectorAll('img').length;page.warnings.push(...prepared.warnings);
    $('page-title').textContent=page.title;
    await pool(page.resources,r=>loadResource(r));
    await offer();
  } finally {
    if(page?.snapshot){globalThis.__atwPageSessions?.delete(page.snapshot);globalThis.__atwSessions?.delete(page.snapshot);}
    embeddedFrame?.remove();embeddedFrame=null;
  }
}
async function init() {
  $('heading').textContent = {docx:'网页转换成 Word',article:'保存正文 HTML',html:'保存完整 HTML 网页',pdf:'保存完整网页 PDF'}[kind];
  try {
    if (!sourceTab) throw Error('请从原网页点击插件打开');
    const [loading] = await chrome.scripting.executeScript({target:{tabId:sourceTab},func:()=>globalThis.webConvertLoader?.status()});
    if(['running','stopping'].includes(loading?.result?.phase))throw Error('网页仍在加载，请等待完成或停止加载后再保存');
    if(kind==='docx'||kind==='article'){
      await chrome.scripting.executeScript({target:{tabId:sourceTab},files:['article.js']});
      const [hint]=await chrome.scripting.executeScript({target:{tabId:sourceTab},func:()=>globalThis.findEmbeddedArticle()});
      embeddedHint=hint.result;
      if(embeddedHint){
        $('page-title').textContent=embeddedHint.title;
        if(!await chrome.permissions.contains({permissions:['pageCapture']})){
          status('文章正文位于嵌入页面，需要读取浏览器已加载的正文和配图。');
          $('continue').hidden=false;$('continue').textContent='读取嵌入正文并转换';$('continue').dataset.phase='embedded';
          return;
        }
        await convertEmbedded();return;
      }
    }
    if (format === 'docx') {
      await chrome.scripting.executeScript({target:{tabId:sourceTab},files:['vendor/Readability.js','article.js','extract.js']});
      const [r] = await chrome.scripting.executeScript({target:{tabId:sourceTab},func:() => globalThis.extractArticle()}); page = r.result;
    } else {
      await chrome.scripting.executeScript({target:{tabId:sourceTab},files:kind==='article'?['vendor/Readability.js','article.js','snapshot.js']:['snapshot.js']});
      const [r] = await chrome.scripting.executeScript({target:{tabId:sourceTab},func:mode => globalThis.capturePage(mode),args:[kind==='article'?'article':'full']}); page = r.result;
    }
    if (!page) throw Error('未能读取页面');
    $('page-title').textContent = page.title;
    if (await chrome.permissions.contains({permissions:['pageCapture']})) {
      try { nativeArchive = await captureNativeArchive(sourceTab,page); } catch(e) { page.warnings.push('浏览器归档读取失败：' + e.message); }
    }
    await loadFonts();
    let done = 0;
    await pool(page.resources,async r => { await loadResource(r); status('正在保存资源：' + (++done) + ' / ' + page.resources.length); });
    await offer();
  } catch (e) { status('转换失败：' + e.message + '\n请确认原网页仍打开，然后重新转换。'); }
  finally {
    if(page?.snapshot)try{await chrome.scripting.executeScript({target:{tabId:sourceTab},func:id=>{globalThis.__atwPageSessions?.delete(id);globalThis.__atwSessions?.delete(id);},args:[page.snapshot]});}catch{}
  }
}
init();
