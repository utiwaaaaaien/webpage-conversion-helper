# V2.4 validation / 验证记录

2026-10-09，Chrome 本机验证。测试使用实际可访问的 KM 页面；原文章内容、URL、截图和导出文件均未纳入仓库。

已完成：

- 嵌入正文的实际文章：Word 与正文 HTML 导出。去除侧栏组件后，正文逐字规范化比对一致；Word 含一张内嵌配图，正文 HTML 图片离线可显示，保留署名和原字体、字号、图片尺寸。
- 普通 KM 文章：跳过两个空的编辑器容器，识别实际正文；自动加载与正文导出回归。
- `tests/article-browser.html`：隐藏/空容器、KM 重复容器、署名保留、正文缺失、CID 图片/CSS、归档解析、脚本/事件清理、沙箱和渲染检查。
- Node 回归：PDF 消息与分块边界；资源流式上限、取消与过期引用。
- 安装目录与 ZIP 运行时一致，静态语法、Manifest、资源引用、图标及 ZIP 完整性。

浏览器回归运行方式：在仓库目录启动仅绑定本机的静态服务器，打开 `tests/article-browser.html`，点击运行按钮。该用例只使用合成文本与一像素图片，不包含实际业务文章。

范围限制：正文 HTML 和 Word 已支持识别到的嵌入正文。完整 HTML/PDF 中跨域框架仍有既有保存限制；动态脚本、虚拟列表、未加载资源及不能确认正文范围的其他网页仍需用户检查。

English: Real embedded and ordinary KM articles were tested locally. Article text was compared with the source and Word/HTML outputs inspected. Public fixtures contain synthetic data only. Full-page HTML/PDF still have the existing cross-origin frame limitation.
