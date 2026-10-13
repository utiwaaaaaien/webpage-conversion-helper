document.getElementById('run').onclick=async()=>{
 const results=[],text='正文中的真实段落、强调文字和末尾署名必须保留。'.repeat(12),frames=[];
 const assert=(name,value)=>{if(!value)throw Error(name);results.push('PASS '+name);};
 async function doc(html){const f=document.createElement('iframe');frames.push(f);f.style='width:768px;height:1000px';await new Promise(r=>{f.onload=r;f.srcdoc=html;document.body.append(f);});return f.contentDocument;}
 try{
  let d=await doc('<div id="js_content" hidden>空壳</div><article><p>'+text+'</p><footer class="signature">末尾署名</footer></article><aside>相关推荐</aside>');
  assert('隐藏空壳优先级回退',findArticleElements(d,'https://example.test/article').root.tagName==='ARTICLE');
  let word=extractArticle({document:d,url:'https://example.test/article'});assert('Word 保留文章署名',word.html.includes('末尾署名'));assert('Word 排除推荐组件',!word.html.includes('相关推荐'));
  d=await doc('<div id="js_content"></div><main><p>'+text+'</p></main>');assert('空正文容器回退',findArticleElements(d,'https://example.test/article').root.tagName==='MAIN');
  d=await doc('<div class="km-article-content" hidden>'+text+'</div><div class="km-article-content">'+text+'</div>');assert('KM 重复隐藏容器',findArticleElements(d,'https://km.woa.com/articles/test').root===d.querySelectorAll('.km-article-content')[1]);
  d=await doc('<main>尚未加载</main>');let failed=false;try{extractArticle({document:d,url:'https://example.test/article'});}catch{failed=true;}assert('空正文拒绝生成整页 Word',failed);
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=';
  const html='<link rel="stylesheet" href="cid:css"><article><p>'+text+'</p><img src="cid:image" onload="parent.compromised=true"><footer>末尾署名</footer></article><script>parent.compromised=true</script><iframe src="https://example.test/unsafe"></iframe>';
  const data=(type,value)=>'data:'+type+';base64,'+btoa(unescape(encodeURIComponent(value)));
  const archive={documents:[{location:'https://frame.example.test/story/',text:html}],resources:new Map([['cid:css',{type:'text/css',location:'https://frame.example.test/a.css',data:data('text/css','p{color:rgb(123,45,67);font-size:21px}')}],['cid:image',{type:'image/png',data:png}]])};
  const prepared=await prepareEmbeddedArticle(archive,{frameURL:'https://frame.example.test/story'});
  assert('CID 样式与图片内嵌',prepared.html.includes('data:image/png')&&prepared.html.includes('rgb(123,45,67)'));
  assert('归档脚本和事件清理',!prepared.html.includes('<script')&&!prepared.html.includes('onload=')&&!prepared.html.includes('<iframe'));
  const f=await renderEmbeddedArticle(prepared.html,{width:768,height:1000});frames.push(f);d=f.contentDocument;
  assert('归档原样式渲染',d.defaultView.getComputedStyle(d.querySelector('p')).fontSize==='21px');assert('沙箱禁止脚本',!window.compromised&&!f.sandbox.contains('allow-scripts'));
  const page=await capturePage('article',{document:d,url:'https://frame.example.test/story'});assert('正文快照包含文字和图片',page.html.includes(text)&&page.html.includes('data:image/png'));
  failed=false;try{await prepareEmbeddedArticle({...archive,documents:[]},{frameURL:'https://frame.example.test/story'});}catch{failed=true;}assert('缺失嵌入正文明确失败',failed);
  d=await doc('<main><iframe src="https://frame.example.test/story" srcdoc="" style="width:700px;height:900px"></iframe></main>');
  assert('独立嵌入正文识别',!!findEmbeddedArticle(d,'https://example.test/article'));
  d=await doc('<main><iframe src="https://www.youtube.com/embed/test" srcdoc="" style="width:700px;height:900px"></iframe></main>');
  assert('视频框架不视为正文',!findEmbeddedArticle(d,'https://example.test/article'));
  d=await doc('<main><iframe src="https://frame.example.test/a" srcdoc="" style="width:700px;height:900px"></iframe><iframe src="https://frame.example.test/b" srcdoc="" style="width:700px;height:900px"></iframe></main>');
  failed=false;try{findEmbeddedArticle(d,'https://example.test/article');}catch{failed=true;}assert('多个嵌入正文明确失败',failed);
  d=await doc('<div class="iframe-body">正文正在加载</div>');failed=false;try{findEmbeddedArticle(d,'https://km.woa.com/articles/test');}catch{failed=true;}assert('KM 嵌入正文未加载明确失败',failed);
  const raw='MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="test"\r\n\r\n--test\r\nContent-Type: text/html; charset=utf-8\r\nContent-Location: https://frame.example.test/story/\r\nContent-Transfer-Encoding: base64\r\n\r\n'+btoa('<article>test</article>')+'\r\n--test--\r\n';
  assert('MHTML HTML 文档解析',parsePageArchive(new TextEncoder().encode(raw).buffer).documents[0].text==='<article>test</article>');
  d=await doc('<style>article span{color:rgb(12,34,56);font-size:17px}article span:before{content:"§";color:rgb(90,80,70)}</style><article>'+('<span>长文正文 </span>'.repeat(5500))+'</article><aside>推荐内容</aside>');
  const longPage=await capturePage('article',{document:d,url:'https://example.test/long'});
  assert('长文共享样式避免重复膨胀',longPage.html.length<3*1024*1024);
  const longDoc=await doc(buildOfflinePage(longPage,new Map()));
  assert('长文首尾与正文边界',longDoc.querySelectorAll('article span').length===5500&&!longDoc.body.textContent.includes('推荐内容'));
  const last=longDoc.querySelector('article span:last-child'),win=longDoc.defaultView;
  assert('共享样式保留字体和颜色',win.getComputedStyle(last).fontSize==='17px'&&win.getComputedStyle(last).color==='rgb(12, 34, 56)');
  assert('共享伪元素保留内容和颜色',win.getComputedStyle(last,'::before').content==='"§"'&&win.getComputedStyle(last,'::before').color==='rgb(90, 80, 70)');
  d=await doc('<article><p>'+text+'</p><iframe srcdoc="&lt;style&gt;p:before{content:&#39;子页&#39;;color:rgb(23,45,67)}&lt;/style&gt;&lt;p&gt;嵌入正文&lt;/p&gt;"></iframe></article>');
  await new Promise(r=>d.querySelector('iframe').contentDocument.readyState==='complete'?r():d.querySelector('iframe').addEventListener('load',r,{once:true}));
  const nestedPage=await capturePage('full',{document:d,url:'https://example.test/nested'}),nestedDoc=await doc(buildOfflinePage(nestedPage,new Map()));
  const nestedFrame=nestedDoc.querySelector('iframe');
  // Exported frames deliberately have an opaque origin; inspect their saved source.
  assert('嵌套页面保留独立样式表',nestedFrame.srcdoc.includes('data-atw-before')&&nestedFrame.srcdoc.includes('rgb(23, 45, 67)'));
 }catch(e){results.push('FAIL '+e.message);}finally{frames.forEach(f=>f.remove());document.getElementById('results').textContent=results.join('\n');}
};
