# Privacy policy

Updated: 2026-10-09. Applies to version 2.4.0.

[简体中文](PRIVACY.zh-CN.md) · [Home](../README.en.md)

## Information read and processed

When you initiate page loading or conversion, the extension reads the current page's title, URL, accessible content, styles, and resources to generate Word, HTML, or PDF. Full-page snapshots can include current values of ordinary inputs, textareas, and select controls, so exported files may contain personal or internal information. Password and file-input `value` attributes are removed from snapshots; this does not guarantee removal of sensitive information displayed elsewhere on the page.

Resource retrieval uses existing browser access and authenticated sessions where permitted. The code does not extract or store credentials through cookie or identity APIs and does not bypass website authentication.

## Local processing and network requests

Conversion takes place locally. The current code has no developer upload endpoint, telemetry, advertising, cloud conversion service, or background browsing-history collection. It does not use extension storage APIs to create a persistent webpage database.

Automatic scrolling triggers the website's normal content and image requests. Retrieving missing images, fonts, or styles contacts their original URLs and may include existing session credentials allowed by the browser. Those websites process requests and network information under their own policies. Local conversion does not mean the operation is entirely offline.

Executable scripts are bundled with the extension rather than downloaded for execution. Downloading releases, reading documentation, or submitting issues on GitHub is subject to GitHub's own policies.

## Permissions and controls

Clicking the toolbar icon grants temporary current-page access through `activeTab`; `scripting` reads content and performs user-initiated loading. Chrome page archive access (`pageCapture`) and access to particular HTTP/HTTPS resource origins are optional and requested through export actions. Granted site permissions can persist and can be managed in Chrome's extension details.

You can stop loading, decline retrieval permissions, close conversion pages, or uninstall the extension. Page data and resources are held in memory and temporary browser objects during processing. The conversion flow cleans up some temporary references; closing the associated pages or tabs ends their page contexts.

## Exported files and deletion

Files are saved through browser downloads or native printing. Browser settings determine whether files are saved directly to a default directory or a location prompt appears. Files remain until you delete them. Uninstalling the extension does not delete exports.

Full-page HTML stores a static page and removes executable scripts, event handlers, and form submission behavior. Exports may still include personal content, ordinary form values, and original website links. Inspect them before sharing. Following a link in a saved file contacts the destination website.

## Updates and contact

Changes to data handling will be documented here and in the changelog. The maintainer account is [utiwaaaaaien](https://github.com/utiwaaaaaien). Use [GitHub Issues](https://github.com/utiwaaaaaien/webpage-conversion-helper/issues) for general privacy questions, without posting private pages, credentials, or sensitive files. For vulnerabilities, see the [security policy](../SECURITY.md).

V2.4 reuses optional pageCapture for embedded articles in Word/article HTML. The preview is local and script-free. Missing embedded documents or unloaded article images cause a clear error.
