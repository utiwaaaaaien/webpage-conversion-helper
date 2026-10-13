const frame=document.getElementById('page'),button=document.getElementById('print'),dimensions=document.getElementById('dimensions');
const token=new URLSearchParams(location.search).get('token');
button.addEventListener('click',()=>frame.contentWindow.print());
async function prepare(){
  try{
    const info=await chrome.runtime.sendMessage({type:'pdf-info',token});
    if(!info)throw Error('预览已过期，请重新转换原网页。');
    if(!Number.isInteger(info.length)||info.length<1||info.length>64*1024*1024||info.parts!==Math.ceil(info.length/(512*1024))||!Number.isFinite(info.viewport?.width)||info.viewport.width<1||info.viewport.width>20000||!Number.isFinite(info.viewport?.height)||info.viewport.height<1||info.viewport.height>200000||!Number.isFinite(info.viewport?.contentWidth||info.viewport.width))throw Error('PDF 页面尺寸或内容无效，请重新转换');
    document.title=(info.title||'网页')+' - 完整网页 PDF';
    const parts=[];
    for(let index=0;index<info.parts;index++){const part=await chrome.runtime.sendMessage({type:'pdf-part',token,index});if(typeof part?.text!=='string'||part.text.length!==Math.min(512*1024,info.length-index*512*1024))throw Error('页面内容传输中断，请重新转换。');parts.push(part.text);}
    frame.width=info.viewport.width;frame.height=info.viewport.height;
    const loaded=new Promise(resolve=>frame.onload=resolve);frame.srcdoc=parts.join('');parts.length=0;await loaded;
    const doc=frame.contentDocument,win=frame.contentWindow;
    await Promise.race([Promise.all([doc.fonts.ready,...[...doc.images].map(e=>e.decode().catch(()=>{}))]),new Promise(r=>setTimeout(r,8000))]);
    // Fixed/sticky widgets should appear once, rather than on every print segment.
    for(const el of [...doc.querySelectorAll('[data-atw-node]')]){
      const cs=win.getComputedStyle(el);
      if(cs.position==='fixed'){
        const r=el.getBoundingClientRect();
        if(r.right<=0||r.left>=info.viewport.width||r.bottom<=0||r.top>=info.viewport.height){el.remove();continue;}
        doc.body.append(el);
        for(const [key,value] of Object.entries({position:'absolute',left:r.left+'px',top:r.top+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px',margin:'0',transform:'none',translate:'none'}))el.style.setProperty(key,value,'important');
      }else if(cs.position==='sticky'){el.style.setProperty('position','relative','important');el.style.setProperty('inset','auto','important');}
    }
    // Native printing can omit a select's displayed value. Freeze that value.
    for(const select of [...doc.querySelectorAll('select')]){
      const value=doc.createElement('span'),rect=select.getBoundingClientRect();
      value.style.cssText=select.style.cssText;
      if(select.hasAttribute('data-atw-css'))value.setAttribute('data-atw-css',select.getAttribute('data-atw-css'));
      value.textContent=[...select.selectedOptions].map(option=>option.textContent).join(', ');
      for(const [key,text] of Object.entries({display:'inline-block',width:rect.width+'px',height:rect.height+'px','box-sizing':'border-box'}))value.style.setProperty(key,text,'important');
      select.replaceWith(value);
    }
    const width=Math.ceil(Math.max(info.viewport.width,info.viewport.contentWidth||0));
    const height=Math.ceil(Math.max(doc.documentElement.scrollHeight,doc.body.scrollHeight));
    // Chromium's paper size limit is 200 inches. Extremely long pages use
    // browser-width long segments, rather than an A4 paper template.
    const pageHeight=Math.min(height+2,19198);
    const style=doc.createElement('style');
    style.textContent='@page{size:'+((width+1)*.75)+'pt '+(pageHeight*.75)+'pt;margin:0}html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}';
    doc.head.append(style);
    frame.width=width;frame.height=height;
    dimensions.textContent=width+' × '+height+' 像素 · '+(height>19198?'超长页面按长页分段':'单张连续长页')+' · 文字可选择、搜索';
    if(height>19198)document.getElementById('help').textContent='页面超过单页尺寸上限，将按网页宽度分成长页；选择「另存为 PDF」，边距「无」，保留背景图形。';
    const failed=[...doc.images].filter(e=>e.getAttribute('src')&&!e.naturalWidth).length;
    if(failed)throw Error(failed+' 个图片元素未正常载入，请返回原网页重新保存。');
    button.disabled=false;
    // Chrome's native dialog exposes the actual PDF page before saving it.
    frame.contentWindow.print();
  }catch(e){dimensions.textContent='PDF 预览未能生成';document.getElementById('error').textContent=e.message;}
}
prepare();
