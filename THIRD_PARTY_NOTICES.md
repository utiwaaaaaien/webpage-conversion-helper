# 第三方声明 / Third-party notices

项目根目录 MIT 许可证适用于项目自有代码与文档，不替代第三方组件的原有许可。分发时保留以下文件与组件内声明。

The root MIT license applies to original project code and documentation and does not replace third-party licenses. Retain the following license files and notices when redistributing.

| 组件 / Component | 来源 / Upstream | 随包许可证 / Included license |
| --- | --- | --- |
| Readability 0.6.0 | [mozilla/readability](https://github.com/mozilla/readability) | Apache-2.0; `extension/vendor/Readability-LICENSE.md`, `extension/vendor/Apache-2.0-LICENSE.txt` |
| docx 9.6.1 | [dolanmiu/docx](https://github.com/dolanmiu/docx) | MIT; `extension/vendor/docx-LICENSE` |

保留原安装包内组件及版权声明。已与 npm 官方包逐字节核对：`Readability.js` 与 `@mozilla/readability` 0.6.0 一致，`docx.js` 与 `docx` 9.6.1 的 `dist/index.iife.js` 一致。核对依据见 [依赖来源记录](docs/DEPENDENCY_PROVENANCE.json)。

The supplied `Readability.js` is byte-for-byte identical to `@mozilla/readability` 0.6.0, and `docx.js` is identical to `docx` 9.6.1 `dist/index.iife.js` from the npm registry. See [dependency provenance](docs/DEPENDENCY_PROVENANCE.json).

`docx.js` 包含打包依赖与浏览器兼容代码。其许可参考文件依据上游同版本源码锁文件整理，见 [依赖许可证](extension/vendor/docx-DEPENDENCY-LICENSES.md)，包括 MIT 与 zlib 声明；JSZip 选择 MIT 许可。该清单覆盖上游运行依赖与浏览器兼容组件，并不声称每一项都出现在最终浏览器文件中。

For bundled dependencies and browser polyfills in `docx.js`, [dependency license references](extension/vendor/docx-DEPENDENCY-LICENSES.md) use the lockfile from the same upstream version. They include MIT and zlib notices. JSZip is used under its MIT option. The reference list covers upstream runtime dependencies and browser polyfills; not every listed package is asserted to appear in the final browser bundle.
