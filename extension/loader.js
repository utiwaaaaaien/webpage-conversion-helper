/* Runs in the page's isolated world. Closing the popup does not stop the job. */
(() => {
  if (globalThis.webConvertLoader?.version === '2.5') return;
  let state = {phase:'idle',steps:0,loaded:0,total:0,warnings:[]}, job;
  const limits = {milliseconds:120000,steps:600,height:200000,containers:24,growth:40};
  const status = () => ({...state,warnings:[...state.warnings]});
  const warn = text => { if (!state.warnings.includes(text)) state.warnings.push(text); };
  const sleep = (ms,signal) => new Promise((resolve,reject) => {
    if(signal.aborted) return reject(signal.reason);
    const finish = () => {clearTimeout(timer);signal.removeEventListener('abort',abort);resolve();};
    const abort = () => {clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason);};
    const timer=setTimeout(finish,ms);signal.addEventListener('abort',abort,{once:true});
  });
  const visible = el => {const r=el.getBoundingClientRect(),s=el.ownerDocument.defaultView.getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
  async function run(current) {
    const {signal}=current.abort, started=Date.now(), records=[], known=new Set(), docs=new Set(), roots=new Set(), listeners=[], observers=[];
    let growth=0, interrupted=false;
    const abortManual = event => {
      if(event.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
      if(!event.isTrusted)return;
      interrupted=true;current.abort.abort(new Error('manual'));
    };
    async function discover(doc,depth=0) {
      if(depth>4)return warn('部分嵌入内容层级较深，请检查原网页。');
      if(!docs.has(doc)) {
        docs.add(doc);roots.add(doc);
        for(const type of ['wheel','touchstart','pointerdown','keydown']){doc.addEventListener(type,abortManual,{capture:true,passive:true});listeners.push([doc,type]);}
        const observer=new MutationObserver(changes=>{
          let removed=0;
          for(const change of changes)for(const node of change.removedNodes)removed+=(node.textContent||'').length;
          if(removed>2000)warn('网页在滚动时替换了较多内容，导出前请检查正文完整性。');
        });observer.observe(doc.documentElement,{childList:true,subtree:true});observers.push(observer);
      }
      const add = el => {
        if(!el||known.has(el))return;
        known.add(el);
        if(records.length>=limits.containers)return warn('可滚动区域较多，未遍历的区域请检查原网页。');
        const properties=['scroll-behavior','scroll-snap-type','overflow-anchor'];
        const styles=properties.map(key=>[key,el.style.getPropertyValue(key),el.style.getPropertyPriority(key)]);
        records.push({el,doc,left:el.scrollLeft,top:el.scrollTop,styles,scanned:0});
        for(const [key,value] of [['scroll-behavior','auto'],['scroll-snap-type','none'],['overflow-anchor','none']])el.style.setProperty(key,value,'important');
      };
      add(doc.scrollingElement);
      const queue=[doc];let count=0,budget=performance.now();
      while(queue.length&&count<12000){
        const root=queue.shift(),walker=doc.createTreeWalker(root,NodeFilter.SHOW_ELEMENT);
        for(let el=walker.nextNode();el&&count<12000;el=walker.nextNode()){
          count++;
          if(performance.now()-budget>12){await sleep(0,signal);guard();budget=performance.now();}
          if(el.shadowRoot&&visible(el)){roots.add(el.shadowRoot);queue.push(el.shadowRoot);}
          if(el!==doc.scrollingElement&&el.clientHeight>80&&el.clientWidth>80&&el.scrollHeight>el.clientHeight+80&&visible(el)&&/^(auto|scroll)$/.test(doc.defaultView.getComputedStyle(el).overflowY))add(el);
          if(el.localName==='iframe'&&visible(el)){
            let inner;try{inner=el.contentDocument;}catch{}
            if(inner?.documentElement)await discover(inner,depth+1);else warn('跨域嵌入内容需在原网页检查。');
          }
        }
      }
      if(count>=12000)warn('页面元素较多，只检查了前 12000 个元素的内部滚动区域。');
    }

    const images = () => [...roots].flatMap(root=>[...root.querySelectorAll('img')]).filter(visible);
    function update() {
      const list=images();state.loaded=list.filter(el=>el.complete&&el.naturalWidth>0).length;state.total=list.length;state.elapsed=Math.round((Date.now()-started)/1000);
    }
    function guard() {
      if(signal.aborted)throw signal.reason;
      if(Date.now()-started>limits.milliseconds||state.steps>=limits.steps)throw Error('limit');
    }
    async function settle() {
      await sleep(180,signal);
      const pending=images().filter(el=>{const r=el.getBoundingClientRect(),win=el.ownerDocument.defaultView;return !el.complete&&r.bottom>0&&r.top<win.innerHeight&&r.right>0&&r.left<win.innerWidth;});
      if(pending.length)await Promise.race([Promise.allSettled(pending.map(el=>el.decode())),sleep(1000,signal)]);
      guard();update();
    }
    try {
      await discover(document);
      let again=true;
      while(again) {
        again=false;
        for(let index=0;index<records.length;index++) {
          const record=records[index],{el,doc}=record;
          if(!el.isConnected||record.scanned&&el.scrollHeight<=record.scanned+2)continue;
          if(doc!==document)doc.defaultView.frameElement?.scrollIntoView({block:'center',behavior:'instant'});
          if(el!==doc.scrollingElement)el.scrollIntoView({block:'center',behavior:'instant'});
          let position=record.scanned?Math.max(0,record.scanned-el.clientHeight):0,stable=0,lastHeight=el.scrollHeight;
          for(;;) {
            guard();
            if(el.scrollHeight>limits.height)throw Error('height');
            const maximum=Math.max(0,el.scrollHeight-el.clientHeight);
            el.scrollTo({left:record.left,top:Math.min(position,maximum),behavior:'instant'});
            state.steps++;await settle();
            if(Math.min(position,maximum)>el.scrollTop+4&&maximum>0) {warn('有滚动区域无法继续移动，请检查原网页。');break;}
            const height=el.scrollHeight,bottom=Math.max(0,height-el.clientHeight);
            if(height>lastHeight+2){growth++;stable=0;if(growth>limits.growth)throw Error('growth');}
            lastHeight=height;
            if(el.scrollTop>=bottom-2) {
              await sleep(350,signal);guard();
              if(el.scrollHeight===height)stable++;else stable=0;
              if(stable>=3)break;
              position=bottom;
            } else {stable=0;position=Math.min(el.scrollTop+Math.max(160,el.clientHeight*.8),bottom);}
          }
          record.scanned=el.scrollHeight;
          await discover(doc);
        }
        again=records.some(record=>record.el.isConnected&&record.el.scrollHeight>record.scanned+2);
      }
      await Promise.race([Promise.allSettled([...docs].map(doc=>doc.fonts.ready)),sleep(2000,signal)]);
      guard();update();
      const failed=images().filter(el=>!el.complete||!el.naturalWidth).length;
      if(failed)warn(failed+' 张图片尚未正常载入，可再次加载或检查原网页。');
      state.phase=state.warnings.length?'partial':'done';
    } catch(error) {
      if(signal.aborted)state.phase='stopped';
      else if(['limit','height','growth'].includes(error.message)){
        state.phase='partial';warn(error.message==='growth'?'网页持续追加内容，已停止继续加载。可再次点击加载。':'已达到本次加载上限，已加载的内容可导出，也可再次加载。');
      } else {state.phase='error';warn('加载中断：'+error.message+'。请刷新原网页后重试。');}
    } finally {
      for(const observer of observers)observer.disconnect();
      for(const [doc,type] of listeners)doc.removeEventListener(type,abortManual,{capture:true});
      // Restore nested positions first; the main document is restored last.
      for(const record of [...records].reverse()) {
        try {
          if(!interrupted&&record.el.isConnected)record.el.scrollTo({left:record.left,top:record.top,behavior:'instant'});
          for(const [key,value,priority] of record.styles){if(value)record.el.style.setProperty(key,value,priority);else record.el.style.removeProperty(key);}
        }catch{}
      }
      try{update();}catch{}
      state.interrupted=interrupted;
      if(job===current)job=undefined;
    }
  }
  globalThis.webConvertLoader={
    version:'2.5',status,
    start(){if(job)return status();state={phase:'running',steps:0,loaded:0,total:0,warnings:[],elapsed:0};job={abort:new AbortController()};void run(job);return status();},
    stop(){if(job){state.phase='stopping';job.abort.abort(new Error('stop'));}return status();}
  };
})();
