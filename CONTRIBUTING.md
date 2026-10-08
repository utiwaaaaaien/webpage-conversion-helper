# 贡献指南 / Contributing

欢迎报告问题、改进文档或提交 Pull Request。请先说明具体问题与复现步骤；涉及权限、数据访问或导出规则的变更，请同步更新中英文文档和隐私说明。

Issue reports, documentation improvements, and pull requests are welcome. Describe the concrete problem and reproduction steps. Keep both language versions and privacy documentation aligned with permission, data-access, or export changes.

## 项目结构 / Layout

| 目录 / File | 用途 / Purpose |
| --- | --- |
| `extension/manifest.json` | Chrome 配置与权限 / Chrome configuration and permissions |
| `extension/popup.*`、`loader.js` | 格式选择与加载 / Format selection and loading |
| `extension/extract.js`、`article.js`、`snapshot.js` | 正文与页面读取 / Article and page capture |
| `extension/export.*`、`html.js`、`word.js`、`model.js`、`archive.js` | 转换与资源补全 / Conversion and resource retrieval |
| `extension/pdf.js`、`render.*` | PDF 预览与打印 / PDF preview and printing |
| `extension/vendor/` | 打包依赖与许可证 / Bundled dependencies and licenses |
| `docs/` | 双语使用与隐私说明 / Bilingual usage and privacy docs |
| `scripts/` | 文件验证与安装包打包 / Static validation and packaging |

## 本地验证 / Local checks

使用 Python 3.9+ 和 Node.js 运行： / With Python 3.9+ and Node.js, run:

```sh
python3 scripts/validate.py
python3 scripts/package.py --output dist
```

无需安装项目依赖或构建。加载 `extension` 到 Chrome 的开发者模式，使用公开测试页或脱敏页面验证正文、表格、图片、长页、内部滚动区域、停止恢复、资源拒绝及四种导出。检查生成的 Word、HTML 与 PDF 实际内容。

No project dependency installation or build is required. Load `extension` in Chrome's Developer mode and use public or sanitized pages to verify articles, tables, images, long pages, internal scrolling, stopping/restoration, denied resource access, and all four export formats. Inspect actual Word, HTML, and PDF outputs.

静态检查只确认文件结构、语法、引用与许可等，不代替真实浏览器转换测试。发布前应核对版本与更新记录，不应重复发布同版本的不同程序行为。新增第三方组件时保留许可证和必要声明，并记录来源与版本。

Static checks confirm structure, syntax, references, and licensing; they do not replace real browser conversion tests. Align the version and changelog before releasing. Do not publish different program behavior under the same version. Preserve licenses and required notices when adding dependencies, and record their source and version.

请勿提交导出的私人网页、账号凭据、浏览器配置、浏览记录、业务文件、`.env` 或安装依赖目录。项目自有贡献按 MIT 许可证提交；第三方文件遵循其原许可证。

Do not commit private webpage exports, credentials, browser profiles, browsing history, business files, `.env` files, or installed dependency directories. Original project contributions use MIT; third-party files follow their own licenses.
