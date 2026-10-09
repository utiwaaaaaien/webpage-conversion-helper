<p align="center"><img src="extension/icons/icon-128.png" width="80" alt="Webpage Conversion Helper icon"></p>

# Webpage Conversion Helper · 网页转换助手

**Save the current webpage as Word, article HTML, full-page HTML, or PDF, with conversion performed locally.**

[简体中文](README.md) · [Download](https://github.com/utiwaaaaaien/webpage-conversion-helper/releases/latest) · [User guide](docs/USAGE.en.md) · [Privacy](docs/PRIVACY.en.md) · [Changelog](CHANGELOG.md)

Use it to save articles, organize research, create editable documents, and read loaded webpages offline. Optional automatic scrolling helps load lazy images and content. The export screen reports missing resources and capture limits.

Version **2.4.0** requires **Chrome 116 or later**. The extension interface is currently in **Simplified Chinese**; documentation is available in Chinese and English. Distribution is through GitHub downloads. There is no Chrome Web Store listing yet.

## Export formats

| Format | Content | Useful for |
| --- | --- | --- |
| Word `.docx` | Identified article text, images, headings, tables, lists, and supported formatting, laid out on document pages | Editing and annotation |
| Article HTML | Article content with captured styles and accessible images, excluding navigation and other surrounding elements where identified | Offline article reading |
| Full-page HTML | A static snapshot of the loaded page, including navigation, sidebars, and footer | Preserving the page's reading appearance |
| Webpage PDF | Browser-width long pages through Chrome's native print dialog; text remains selectable and searchable | Reading, archiving, and sharing |

Word reflows content and does not promise pixel-perfect layout. Text inside images remains an image in PDF, and very long pages may split into segments. HTML captures static content; videos generally retain posters rather than playable media.

## Install

1. Download `webpage-conversion-helper-2.4.0-chrome.zip` from [Releases](https://github.com/utiwaaaaaien/webpage-conversion-helper/releases/latest) and extract it.
2. Enter `chrome://extensions` in Chrome's address bar and enable **Developer mode**.
3. Select **Load unpacked**, then select the extracted **`extension` directory**, which directly contains `manifest.json`.
4. Pin **网页转换助手** to the toolbar and open a normal HTTP/HTTPS webpage.

Keep the extracted directory in a permanent location because Chrome loads the extension from it. Do not select the ZIP or repository root. Loading `extension` from a source checkout works the same way.

To update, back up the installed directory, replace its extension files with the new version, click **Reload** on the extensions page, and refresh the webpage. See the [user guide](docs/USAGE.en.md).

## Use

Expand any collapsed sections manually before exporting. Click the toolbar icon, optionally choose **加载全部网页** (Load page content), and wait for it to finish or stop it before selecting a format. Loading continues if you close the popup; reopen it to view progress. Saving is disabled while loading.

If images or fonts are missing, review the export details. You can authorize Chrome page archive access, then access to specific resource origins if needed, or save the available content. Keep the source webpage and export tab open during conversion.

For PDF, choose **Save as PDF**, set margins to **None**, and enable **Background graphics** in Chrome's print dialog.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access to the current webpage after clicking the toolbar icon |
| `scripting` | Read content, styles, and images, and perform loading initiated by the user |
| Optional `pageCapture` | Read Chrome's page archive to recover loaded resources after consent |
| Optional HTTP/HTTPS origins | Request particular resource origins to retrieve missing images or fonts |

Conversion runs locally. The inspected extension code has no developer upload endpoint, advertising, telemetry, or background browsing-history collection. Loading and resource retrieval contact the original websites and may use existing authenticated browser sessions. Full-page snapshots can contain visible personal content and ordinary form values; inspect files before sharing. Read the [privacy policy](docs/PRIVACY.en.md).

## Limitations

- Only accessible, loaded content can be saved. The extension does not bypass authentication, paywalls, or website restrictions.
- Automatic scrolling does not expand collapsed sections, turn pages, or recover content discarded by virtualized lists.
- Each loading run is bounded by approximately 2 minutes, 600 scroll steps, 24 scroll regions, a 200000-pixel height limit, and a content-growth limit.
- Cross-origin frames, protected canvases, unavailable images, and fonts may be omitted. Review export warnings.
- Article detection can fail. Try full-page HTML and inspect the result.
- Chrome internal pages, extension pages, and other restricted pages are unsupported. Other Chromium browsers have not been separately validated.

## Development and feedback

Source and bundled dependencies are included; there is no build step or remotely downloaded runtime script. See [Contributing](CONTRIBUTING.md) for the layout and checks. Report issues through [GitHub Issues](https://github.com/utiwaaaaaien/webpage-conversion-helper/issues), with the extension version, page type, export format, and error details. Remove private content first.

This GitHub release preserves the extension program files from the supplied package and adds publication documentation, licensing, and distribution materials. Release checks cover syntax, references, icons, documentation links, and package integrity; they do not establish successful conversion on every website.

## License

Original project code and documentation use the [MIT License](LICENSE). Third-party components retain their own licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md). Respect website terms and applicable rules when saving or reusing content.

V2.4 fixes embedded article extraction for Word and article HTML, skips hidden or empty containers, and rejects uncertain article boundaries. The existing optional pageCapture permission is reused. Full-page HTML/PDF can still omit cross-origin frames. See [V2.4 validation](docs/VALIDATION-2.4.md).
