# Installation and usage

[Home](../README.en.md) · [简体中文](USAGE.zh-CN.md)

## Install and update

Use Chrome 116 or later. Download the Chrome ZIP from [Releases](https://github.com/utiwaaaaaien/webpage-conversion-helper/releases/latest), extract it to a permanent directory, open `chrome://extensions`, enable Developer mode, and select **Load unpacked**. Choose the `extension` directory that directly contains `manifest.json`. This follows [Chrome's official instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

Pin **网页转换助手** through Chrome's extensions menu. Managed browsers may restrict Developer mode. Moving or deleting the installed directory can break the extension.

For updates, back up the installed directory, replace its files with the new `extension` contents, click **Reload** on the extensions page, and refresh the webpage. Uninstall with **Remove** on that page. Exported files must be deleted separately.

## Load and export

1. Open an HTTP/HTTPS webpage, sign in to the website if necessary, and manually expand content you want to save.
2. Click the toolbar icon and optionally click **加载全部网页** (Load page content). You can export directly if the required content is already loaded.
3. Wait for completion or click **停止加载** (Stop loading). Review the status before selecting Word, article HTML, full-page HTML, or PDF.
4. Keep the source webpage and export tab open until the file or PDF preview is ready.

Automatic loading scrolls the main document, internal scroll regions, and accessible same-origin frames. Completion or the stop button restores the original position. Manual pointer interaction, scrolling, or scrolling keys stop loading and keep your current position. Closing the popup does not stop loading; reopen it to check progress.

Each run is bounded by approximately 2 minutes, 600 scroll steps, 24 scroll regions, a 200000-pixel height limit, and a content-growth limit. Hitting a limit does not mean all content was loaded. Inspect the page before retrying.

## Missing resources

The export screen lists images or fonts that could not be saved. **读取浏览器已加载资源并继续** (Read browser-loaded resources and continue) requests optional Chrome page archive access. If needed, **补全缺失图片和字体** (Retrieve missing images and fonts) requests access to the particular resource origins.

You can decline and save available content. Authorization does not overcome website restrictions, failed requests, or oversized resources. A single fetched asset is limited to 30 MB; a cumulative 150 MB resource budget can stop retrieval earlier. Manage granted site access in Chrome's extension details.

## PDF settings

PDF opens a preview and Chrome's native print dialog. Select **Save as PDF**, margins **None**, and **Background graphics**. Review the preview before saving. If you dismiss the dialog, use the preview's print button to reopen it. Keep the export tab open because it supplies the preview content.

PDF uses browser-width long pages, with segmentation for very long content. Actual webpage text can be searched and selected; text in images is not automatically recognized. Missing images, oversized snapshots, or an expired preview may prevent printing; return to the source page and retry.

## Troubleshooting

| Problem | Suggested action |
| --- | --- |
| Extension will not load | Select the `extension` directory containing `manifest.json`; check the minimum Chrome version |
| Current page cannot be converted | Use an HTTP/HTTPS webpage, refresh, then click the toolbar icon |
| Export buttons disabled | Wait for loading or position restoration to finish; keep the source page open |
| Article incomplete or not identified | Expand content, load the page, try full-page HTML, and inspect the output |
| Missing images or fonts | Review details and optionally authorize retrieval; website restrictions may remain |
| Word layout differs | Word reflows to document pages; try HTML or PDF for webpage appearance |
| Source page changed | Reopen the extension on the intended page and start again |

Private pages may produce exports containing personal content and ordinary form values. Inspect files before sharing. For [issue reports](https://github.com/utiwaaaaaien/webpage-conversion-helper/issues), include versions, format, and sanitized steps; remove credentials, internal URLs, and private content.
