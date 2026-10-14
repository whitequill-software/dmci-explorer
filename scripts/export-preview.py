"""Export the production build as a single browser-openable HTML file."""
from pathlib import Path
import base64
import re
import sys

root = Path(__file__).resolve().parents[1] / 'dist'
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'DMCI-Explorer-Preview.html'

def data_url(asset):
    mime = {'.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp'}.get(asset.suffix, 'application/octet-stream')
    return 'data:' + mime + ';base64,' + base64.b64encode(asset.read_bytes()).decode()

def inline_url(match):
    asset = root / match.group(1).strip('\"\'').lstrip('/')
    return 'url(' + data_url(asset) + ')' if asset.is_file() else match.group(0)

html = (root / 'index.html').read_text(encoding='utf-8')
css = '\n'.join(asset.read_text(encoding='utf-8') for asset in (root / 'assets').glob('*.css'))
css = re.sub(r'url\(([^)]+)\)', inline_url, css)
js = '\n'.join(asset.read_text(encoding='utf-8') for asset in (root / 'assets').glob('*.js'))
js = js.replace('/assets/explorer-hero.webp', data_url(root / 'assets/explorer-hero.webp'))
html = re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
html = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '', html)
html = html.replace('</head>', '<style>' + css + '</style></head>')
html = html.replace('</body>', '<script type="module">' + js.replace('</script', '<\\/script') + '</script></body>')
output.write_text(html, encoding='utf-8')
print(f'Created standalone preview: {output.name} ({output.stat().st_size:,} bytes)')
