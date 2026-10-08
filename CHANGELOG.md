# 更新记录 / Changelog

## 2.3.0 — 2026-10-08

此版本是安装包中的既有版本，本仓库首次公开分发。以下功能来自所提供的代码与版本说明；没有重建不可核实的历史版本。

This is the existing version from the supplied package and the first public release in this repository. Features below are based on the supplied code and notes; earlier release history has not been reconstructed.

### 插件功能 / Extension features

- 自动滚动加载页面、内部滚动区域和可读取的同源嵌入页面，支持停止及位置恢复。 / Automatic scrolling for the page, scroll regions, and accessible same-origin frames, with stopping and position restoration.
- 保存 Word、正文 HTML、完整 HTML 和原生打印 PDF，报告缺失资源并按需补全。 / Word, article HTML, full-page HTML, and native-print PDF exports, with missing-resource details and optional retrieval.
- 分批扫描与快照处理，限制过大页面、样式和资源。 / Batched scanning and snapshot processing, with page, style, and resource limits.
- 加载、恢复和导出操作互斥，检查原网页是否切换。 / Loading, restoration, and export controls prevent conflicting actions and detect source-page navigation.
- 通过属性替换资源引用、清理脚本与危险链接，处理伪元素文字。 / Attribute-based resource replacement, script and unsafe-link cleanup, and pseudo-element text handling.
- PDF 预览校验来源、标签页、内容分块与尺寸；转换后清理源页面临时引用。 / PDF preview validates sender, tab, chunks, and dimensions; conversion cleans up temporary source-page references.
- 明确的扩展内容安全策略、打包脚本、深浅色与无障碍界面样式。 / Explicit extension content security policy, bundled scripts, and light/dark and accessibility styles.

### GitHub 发布资料 / GitHub publication materials

- 中英文介绍、使用指南、权限与隐私说明。 / Chinese and English overview, usage, permission, and privacy documentation.
- MIT 项目许可证，保留第三方声明，补充 Apache 2.0 全文。 / MIT project license, retained third-party notices, and complete Apache 2.0 license text.
- Chrome ZIP、SHA-256 校验文件、贡献指南、反馈模板和自动发布文件检查。 / Chrome ZIP, SHA-256 checksums, contributing guide, issue templates, and automated static package checks.

扩展程序的 JS、HTML、CSS、图标与 manifest 保持原包内容。 / Extension JS, HTML, CSS, icons, and manifest retain the supplied package contents.
