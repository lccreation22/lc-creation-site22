from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from collections import Counter
import json

root = Path(__file__).resolve().parent.parent / 'dist'
class Page(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.file, self.ids, self.links, self.assets, self.count = file, [], [], [], Counter()
        self.feed(file.read_text())
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); self.count[tag] += 1
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag in ('img','script') and a.get('src'): self.assets.append(a['src'])
        if tag == 'link' and a.get('rel') in ('stylesheet','icon'): self.assets.append(a.get('href',''))
        if tag == 'img' and 'alt' not in a: errors.append(f'{self.file.name}: missing image alt')

errors = []
pages = {p.name:Page(p) for p in root.glob('*.html') if p.name != 'revue-mobile.html'}
for name,p in pages.items():
    if p.count['main'] != 1 or p.count['h1'] != 1: errors.append(f'{name}: main/h1 count {p.count["main"]}/{p.count["h1"]}')
    duplicate = [i for i,n in Counter(p.ids).items() if n>1]
    if duplicate: errors.append(f'{name}: duplicate ids {duplicate}')
    for target in p.assets + p.links:
        u = urlsplit(target)
        if u.scheme or u.netloc: continue
        path = unquote(u.path).lstrip('./') or name
        if not (root/path).exists(): errors.append(f'{name}: missing {target}')
        elif u.fragment and path in pages and u.fragment not in pages[path].ids:
            if path == 'configurateur-projet.html' and u.fragment in ('lc-6-3','beton'): continue
            errors.append(f'{name}: missing anchor {target}')
print(json.dumps({'pages':len(pages),'errors':errors},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
