const $=id=>document.getElementById(id);
const buttons=['word','article','html','pdf'].map($);
let sourceTab,poll,busy=false,unavailable=false,epoch=0,phase='idle';
const active=()=>['running','stopping'].includes(phase);
const message=(text,state='idle')=>{if($('status').textContent!==text)$('status').textContent=text;$('status').dataset.state=state;};
function controls(){buttons.forEach(button=>button.disabled=busy||unavailable||!sourceTab||active());$('load').disabled=busy||unavailable||!sourceTab||phase==='stopping';}
function show(state={phase:'idle'}){
  phase=state.phase;
  $('load-label').textContent=phase==='stopping'?'正在停止…':active()?'停止加载':'加载全部网页';
  $('load').classList.toggle('is-running',active());$('load').dataset.phase=phase;$('load-progress').hidden=!active();controls();
  if(phase==='running')message('正在加载网页… 已读取 '+state.loaded+' / '+state.total+' 张图片\n关闭此面板后仍会继续；再次打开可查看进度。','running');
  else if(phase==='stopping')message('正在停止加载并恢复阅读位置…','running');
  else if(phase==='done')message('网页加载完成 · '+state.loaded+' 张图片已载入\n已回到原阅读位置，可以选择保存格式。','done');
  else if(phase==='stopped')message(state.interrupted?'已停止加载，保留当前阅读位置。':'已停止加载，回到原阅读位置。','stopped');
  else if(['partial','error'].includes(phase))message((phase==='partial'?'已加载部分网页 · '+state.loaded+' / '+state.total+' 张图片\n':'')+(state.warnings?.join('\n')||'请返回原网页检查后重试。'),phase);
}
function stopPolling(){clearTimeout(poll);epoch++;}
function fail(error){stopPolling();unavailable=true;message(error.message||'原网页已关闭或不能读取，请重新打开插件。','error');controls();}
async function pageAction(action='status'){
  const [result]=await chrome.scripting.executeScript({target:{tabId:sourceTab.id},func:(action,expected)=>{
    const url=new URL(location.href);url.hash='';
    if(url.href!==expected)return {changed:true};
    return {state:globalThis.webConvertLoader?.[action]()||{phase:'idle'}};
  },args:[action,sourceTab.url]});
  if(result?.result?.changed)throw Error('原网页已切换，请重新打开插件。');
  if(!result?.result?.state)throw Error('原网页已关闭或不能读取，请重新打开插件。');
  return result.result.state;
}
function schedule(){
  if(!active()||unavailable)return;
  const requestEpoch=epoch;
  poll=setTimeout(async()=>{if(busy||requestEpoch!==epoch)return;try{const state=await pageAction();if(requestEpoch!==epoch)return;show(state);schedule();}catch(e){if(requestEpoch===epoch)fail(e);}},500);
}
$('load').addEventListener('click',async()=>{
  if(busy||unavailable||!sourceTab)return;
  busy=true;stopPolling();controls();
  try{const state=await pageAction();if(['running','stopping'].includes(state.phase))show(await pageAction('stop'));else{await chrome.scripting.executeScript({target:{tabId:sourceTab.id},files:['loader.js']});show(await pageAction('start'));}}
  catch(e){fail(e);}finally{busy=false;controls();schedule();}
});
for(const [id,format] of [['word','docx'],['article','article'],['html','html'],['pdf','pdf']])$(id).addEventListener('click',async()=>{
  if(busy||unavailable||!sourceTab)return;
  busy=true;stopPolling();controls();
  try{const state=await pageAction();show(state);if(['running','stopping'].includes(state.phase))return;await chrome.tabs.create({url:chrome.runtime.getURL('export.html')+'?tab='+sourceTab.id+'&format='+format});window.close();}
  catch(e){message('无法打开转换页面：'+e.message,'error');}finally{busy=false;controls();schedule();}
});
window.addEventListener('pagehide',stopPolling,{once:true});
(async()=>{
  controls();
  try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!/^https?:/.test(tab?.url||''))throw Error('请打开需要保存的普通网页，再点击插件。');const url=new URL(tab.url);url.hash='';sourceTab={...tab,url:url.href};$('page-name').textContent=tab.title||'当前网页';$('page-name').title=tab.title||'当前网页';show(await pageAction());schedule();}
  catch(e){$('page-name').textContent='当前页面无法转换';fail(e);}
})();
