# Chrome Web Store 发布资料 / Listing preparation

更新 / Updated: 2026-10-08。这是后续上架参考资料；当前发布渠道为 GitHub，未提交 Chrome 网上应用店。

This is preparation material for a possible future listing. Current distribution is GitHub; no Chrome Web Store submission has been made.

## 商店介绍 / Listing copy

名称 / Name: 网页转换助手（与 manifest 一致 / matches manifest）。

中文短介绍：自动加载网页，保存 Word、正文 HTML、完整 HTML 或可搜索的长页 PDF。

English short description: Save webpages as Word, article HTML, full-page HTML, or searchable PDF, with optional scrolling to load content.

中文详细介绍：网页转换助手将当前可访问网页保存为可编辑 Word 文档、正文 HTML、完整 HTML 或网页 PDF。可先自动滚动加载图片与内容，再选择保存格式。正文模式尽量移除导航与侧栏，完整 HTML 保留当前已加载页面的静态阅读效果。PDF 通过浏览器打印窗口保存，网页文字可选择与搜索。缺失资源会显示提示，资源补全权限由用户按需授权。转换在本机处理，加载和补全会访问原网站资源。不能保证读取跨域、受保护或尚未加载的内容，视频播放与网页交互需访问原网页。界面为简体中文。

English detailed description: Save the current accessible webpage as an editable Word document, article HTML, full-page HTML, or PDF. Optional automatic scrolling helps load images and content before saving. Article modes focus on article content; full-page HTML preserves the static appearance of the loaded page. PDF uses the browser's print dialog and preserves searchable webpage text. Missing resources are reported, and retrieval permissions are optional. Conversion runs locally; loading and retrieval contact the original websites. Restricted, cross-origin, or unloaded content may be unavailable. Video playback and live interactions require the original website. The interface is in Simplified Chinese.

类别建议 / Suggested category: Productivity。

单一用途 / Single purpose: 将当前网页转换为本地文档，用于阅读、编辑与归档。 / Convert the current webpage to local documents for reading, editing, and archiving.

主语言 / Primary language: 简体中文 / Simplified Chinese。

## 素材 / Assets

128×128 PNG 图标已提供。商店规定尺寸的真实功能截图、宣传图尚未准备；不得将仓库页面截图当作功能截图提交。

The 128×128 PNG icon is included. Actual functionality screenshots at store dimensions and promotional assets remain to be prepared. Repository screenshots are not extension functionality screenshots.

## 权限理由 / Permission justifications

| Permission | Type | Justification |
| --- | --- | --- |
| `activeTab` | Required | Temporarily read the page selected by the user after a toolbar click to export its content. |
| `scripting` | Required | Read that page's article, styles, and assets and perform scrolling initiated by the user. |
| `pageCapture` | Optional | Recover resources already loaded in Chrome through a page archive when the user authorizes missing-resource recovery. |
| `http://*/*`, `https://*/*` | Optional host permissions | Permit requests for particular missing image/font origins requested during export. Resource origins vary between websites; access is requested for the needed origins rather than granted to all sites at installation. |

## 数据与隐私 / Data and privacy

代码处理网页内容、当前标题与 URL、资源地址，以及快照中普通表单的值，转换期间使用内存和临时对象。没有开发者服务器上传、遥测或浏览历史数据库。资源读取可能使用网站已有会话。商店的数据披露必须根据提交时的实际代码与最新政策审核，不能因为本机转换就直接勾选「不处理用户数据」。

The code handles page content, the current title and URL, asset URLs, and ordinary form values in snapshots, using memory and temporary objects. There is no developer upload service, telemetry, or browsing-history database. Retrieval can use existing website sessions. Review store disclosures against the submitted code and current policy; local conversion does not justify asserting that no user data is handled.

隐私说明 / Privacy: [中文](docs/PRIVACY.zh-CN.md), [English](docs/PRIVACY.en.md)。公开地址 / Public URL: https://github.com/utiwaaaaaien/webpage-conversion-helper/blob/main/docs/PRIVACY.en.md

## 分发与开发者 / Distribution and developer

GitHub 公开仓库 / Public GitHub repository: https://github.com/utiwaaaaaien/webpage-conversion-helper

维护账号 / Maintainer: utiwaaaaaien。支持 / Support: https://github.com/utiwaaaaaien/webpage-conversion-helper/issues

商店发布者资料、联系邮箱、商店地区及分发设置待发布者提供或确认。 / Store publisher details, contact email, regions, and distribution settings require publisher input before submission.

## 版本与准备状态 / Version and readiness

2.3.0，2026-10-08：GitHub 首次分发，尚未提交商店。 / First GitHub distribution; not submitted to the store.

尚需真实 Chrome 场景测试、商店截图、发布者与邮箱资料、提交时政策及数据声明复核。已核对第三方主组件版本并补充打包依赖许可参考。限制见双语 README。无已知商店审核或拒绝记录。

Still needed: real Chrome scenario tests, store screenshots, publisher/contact details, and a review of current policies and disclosures before submission. Third-party component versions were verified and bundled-dependency license references were added. See the bilingual README for limitations. There is no store review or rejection history.
