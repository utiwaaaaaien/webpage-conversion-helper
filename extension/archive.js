/* Chrome's native archive recovers cached resources without repeating a login. */
(() => {
  function unquote(value) { return value?.replace(/^"|"$/g,'') || ''; }
  function bytes(body, encoding) {
    if (encoding === 'base64') return Uint8Array.from(atob(body.replace(/\s/g,'')),c=>c.charCodeAt(0));
    const value = encoding === 'quoted-printable' ? body.replace(/=\r?\n/g,'').replace(/=([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))) : body;
    return Uint8Array.from(value,c=>c.charCodeAt(0));
  }
  function base64(data) {
    let binary = '';
    for (let i=0;i<data.length;i+=32768) binary += String.fromCharCode(...data.subarray(i,i+32768));
    return btoa(binary);
  }
  globalThis.parsePageArchive = function(buffer) {
    const data = new Uint8Array(buffer); let raw = '';
    for (let i=0;i<data.length;i+=32768) raw += String.fromCharCode(...data.subarray(i,i+32768));
    const split = raw.search(/\r?\n\r?\n/);
    const header = raw.slice(0,split).replace(/\r?\n[ \t]+/g,' ');
    const boundary = /boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(header);
    if (!boundary) throw Error('Chrome 页面归档格式无法识别');
    const resources = new Map(), documents = [];
    for (let part of raw.slice(split).split('--' + (boundary[1]||boundary[2])).slice(1)) {
      if (part.startsWith('--')) break;
      part = part.replace(/^\r?\n/,'');
      const gap = part.search(/\r?\n\r?\n/); if (gap < 0) continue;
      const headers = part.slice(0,gap).replace(/\r?\n[ \t]+/g,' ');
      const values = new Map(headers.split(/\r?\n/).map(line=>{const i=line.indexOf(':');return [line.slice(0,i).toLowerCase(),line.slice(i+1).trim()];}));
      const body = part.slice(gap).replace(/^\r?\n\r?\n/,'').replace(/\r?\n$/,'');
      const content = bytes(body,(values.get('content-transfer-encoding')||'').toLowerCase());
      const type = values.get('content-type') || 'application/octet-stream';
      const location = unquote(values.get('content-location'));
      const id = values.get('content-id')?.replace(/^<|>$/g,'');
      const item = {data:'data:' + type + ';base64,' + base64(content),type,location};
      if (location) resources.set(location,item);
      if (id) resources.set('cid:' + id,item);
      if (/^text\/(html|css)/i.test(type)) {
        const charset = /charset\s*=\s*["']?([^;"'\s]+)/i.exec(type)?.[1] || 'utf-8';
        let text; try { text = new TextDecoder(charset).decode(content); } catch { text = new TextDecoder().decode(content); }
        if (/^text\/html/i.test(type)) documents.push({location,text});
      }
    }
    return {resources,documents};
  };
  globalThis.captureNativeArchive = async function(tabId,page) {
    const blob = await chrome.pageCapture.saveAsMHTML({tabId});
    if (!blob) throw Error('Chrome 未返回页面归档');
    if (blob.size > 200*1024*1024) throw Error('页面归档超过 200 MB');
    const archive = parsePageArchive(await blob.arrayBuffer());
    // Chrome may use CID references. Correlate the native DOM with the live DOM
    // only when image counts agree; never guess a different image by its filename.
    const main = archive.documents.find(d=>d.location===page.url) || archive.documents[0];
    if (main) {
      const doc = new DOMParser().parseFromString(main.text,'text/html');
      const images = [...doc.querySelectorAll('img')];
      for (const image of images) {
        const src = image.getAttribute('src'), item = archive.resources.get(src);
        if (!item) continue;
        for (const attr of ['data-src','data-original']) {
          const alias = image.getAttribute(attr); if (alias) try { archive.resources.set(new URL(alias,page.url).href,item); } catch {}
        }
      }
      if (images.length === page.originalImages?.length) images.forEach((image,i)=>{
        const item = archive.resources.get(image.getAttribute('src'));
        if (item) for (const url of page.originalImages[i]) if (url) archive.resources.set(url,item);
      });
    }
    return archive;
  };
})();
