/* Native browser printing preserves searchable text without remote services. */
globalThis.openWebPDF=async function(page,html){
  if(typeof html!=='string'||!html.length||html.length>64*1024*1024)throw Error('PDF 页面内容无效或过大，请重新转换');
  const token=crypto.randomUUID(),chunkSize=512*1024,parts=Math.ceil(html.length/chunkSize);
  const renderURL=chrome.runtime.getURL('render.html')+'?token='+encodeURIComponent(token);
  let renderTab,timer;
  const listener=(message,sender,respond)=>{
    if(!message||typeof message!=='object'||sender.id!==chrome.runtime.id||sender.url!==renderURL||sender.frameId!==0||!sender.tab||renderTab&&sender.tab.id!==renderTab.id||message.token!==token)return;
    if(message.type==='pdf-info')respond({title:page.title,viewport:page.viewport,length:html.length,parts,warnings:page.warnings||[]});
    else if(message.type==='pdf-part'&&Number.isInteger(message.index)&&message.index>=0&&message.index<parts)respond({text:html.slice(message.index*chunkSize,(message.index+1)*chunkSize)});
  };
  const closed=id=>{if(id===renderTab?.id)cleanup();};
  const cleanup=()=>{chrome.runtime.onMessage.removeListener(listener);chrome.tabs.onRemoved.removeListener(closed);clearTimeout(timer);html='';};
  chrome.runtime.onMessage.addListener(listener);chrome.tabs.onRemoved.addListener(closed);timer=setTimeout(cleanup,10*60*1000);
  try{renderTab=await chrome.tabs.create({url:renderURL});}catch(e){cleanup();throw e;}
};
