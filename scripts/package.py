#!/usr/bin/env python3
"""Build a Chrome unpacked-install ZIP after static validation."""
import argparse
import hashlib
import zipfile
from pathlib import Path
from validate import ROOT, validate

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    manifest = validate()
    args.output.mkdir(parents=True, exist_ok=True)
    target = args.output / f"webpage-conversion-helper-{manifest['version']}-chrome.zip"
    paths = sorted(p for p in (ROOT / 'extension').rglob('*') if p.is_file())
    paths += [ROOT / p for p in ('README.md', 'README.en.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md')]
    paths += sorted(p for p in (ROOT / 'docs').iterdir() if p.is_file())
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            rel = path.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(rel, date_time=(2026, 10, 9, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert 'extension/manifest.json' in archive.namelist()
        assert len(archive.namelist()) == len(set(archive.namelist()))
        for path in paths:
            assert archive.read(path.relative_to(ROOT).as_posix()) == path.read_bytes()
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    checksum = args.output / 'SHA256SUMS.txt'
    checksum.write_text(f'{digest}  {target.name}\n', encoding='utf-8')
    print(f'PACKAGED: {target} ({target.stat().st_size} bytes)')
    print(f'SHA256: {digest}')

if __name__ == '__main__':
    main()
