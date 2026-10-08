#!/usr/bin/env python3
"""Static release checks. Does not install or execute the extension."""
import json
import re
import shutil
import struct
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
        self.errors = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if any(k.lower().startswith('on') for k in attrs):
            self.errors.append('inline event handler')
        if tag == 'script' and not attrs.get('src'):
            self.errors.append('inline script')
        for key in ('src', 'href'):
            value = attrs.get(key)
            if value and not urlsplit(value).scheme and not value.startswith('#'):
                self.paths.append(urlsplit(value).path)

def validate():
    manifest = json.loads((EXT / 'manifest.json').read_text(encoding='utf-8'))
    assert manifest['manifest_version'] == 3, 'Manifest V3 is required'
    assert re.fullmatch(r'\d+(?:\.\d+){0,3}', manifest['version']), 'Invalid version'
    assert manifest['action']['default_popup'], 'Missing popup'
    assert "script-src 'self'" in manifest['content_security_policy']['extension_pages']
    for path in [manifest['action']['default_popup'], *manifest['icons'].values(), *manifest['action']['default_icon'].values()]:
        assert (EXT / path).is_file(), f'Missing manifest file: {path}'
    for size, rel in manifest['icons'].items():
        data = (EXT / rel).read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n', f'Not a PNG: {rel}'
        assert struct.unpack('>II', data[16:24]) == (int(size), int(size)), f'Wrong icon size: {rel}'
    for html in EXT.glob('*.html'):
        parser = References()
        parser.feed(html.read_text(encoding='utf-8'))
        assert not parser.errors, f'{html.name}: {parser.errors}'
        for ref in parser.paths:
            assert (html.parent / unquote(ref)).is_file(), f'{html.name}: missing {ref}'
    scripts = list(EXT.rglob('*.js'))
    for script in scripts:
        for files in re.findall(r'files\s*:\s*\[([^\]]*)\]', script.read_text(encoding='utf-8')):
            for ref in re.findall(r"['\"]([^'\"]+)\.js['\"]", files):
                assert (EXT / (ref + '.js')).is_file(), f'Missing injected script: {ref}'
    node = shutil.which('node')
    assert node, 'Node.js is required for JavaScript syntax validation'
    for script in scripts:
        subprocess.run([node, '--check', str(script)], check=True, capture_output=True)
    for rel in ('LICENSE', 'THIRD_PARTY_NOTICES.md', 'extension/vendor/docx-LICENSE',
                'extension/vendor/Readability-LICENSE.md', 'extension/vendor/Apache-2.0-LICENSE.txt',
                'extension/vendor/docx-DEPENDENCY-LICENSES.md'):
        assert (ROOT / rel).is_file(), f'Missing license: {rel}'
    for md in ROOT.rglob('*.md'):
        if '.git' in md.parts:
            continue
        for ref in re.findall(r'\]\(([^\s)]+)', md.read_text(encoding='utf-8')):
            if urlsplit(ref).scheme or ref.startswith('#'):
                continue
            assert (md.parent / unquote(urlsplit(ref).path)).exists(), f'{md.relative_to(ROOT)}: missing link {ref}'
    for path in EXT.rglob('*'):
        assert not path.is_symlink(), f'Symlink excluded: {path}'
        assert path.name not in ('.env', '.DS_Store'), f'Unwanted file: {path}'
    print(f"PASS: v{manifest['version']}; {len(scripts)} JavaScript files; manifest, PNG dimensions, HTML/script references, licenses and local documentation links.")
    print('Scope: static publication checks only; real browser conversion tests are separate.')
    return manifest

if __name__ == '__main__':
    validate()
