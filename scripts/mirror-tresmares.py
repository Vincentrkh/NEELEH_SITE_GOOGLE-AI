#!/usr/bin/env python3
"""Mirror Tresmares Capital pages locally: download assets via translate proxy, rewrite URLs."""
import re, os, subprocess, hashlib, sys, time

BASE = '/home/z/my-project/tresmares-analysis'
MIRROR = os.path.join(BASE, 'mirror')
os.makedirs(MIRROR, exist_ok=True)

PAGES = {
    'index.html': 'home-es.html',
    'en/index.html': 'page-en-home.html',
    'nosotros/index.html': 'page-about.html',
    'equipo/index.html': 'page-team.html',
    'portfolio/index.html': 'page-portfolio.html',
    'inversores/index.html': 'page-investors.html',
    'contacto/index.html': 'page-contact.html',
    'soluciones-financieras/index.html': 'page-solutions.html',
    'soluciones-financieras/private-equity/index.html': 'page-pe.html',
    'soluciones-financieras/direct-lending/index.html': 'page-dl.html',
    'soluciones-financieras/fund-of-funds/index.html': 'page-fof.html',
    'soluciones-financieras/fund-financing/index.html': 'page-ff.html',
}

PROXY = 'https://www-tresmarescapital-com.translate.goog/{path}?_x_tr_sl=es&_x_tr_tl=en&_x_tr_hl=en'

def fetch(path, out):
    """Fetch /path from origin via translate proxy."""
    url = PROXY.format(path=path)
    r = subprocess.run(['curl', '-s', '--max-time', '60', '-L', url, '-o', out, '-w', '%{http_code}'],
                       capture_output=True, text=True)
    ok = r.stdout.strip() == '200' and os.path.exists(out) and os.path.getsize(out) > 100
    if not ok and os.path.exists(out):
        os.remove(out)
    return ok

def local_path_for(url):
    """Map origin URL to local mirror path."""
    m = re.search(r'tresmarescapital\.com/([^?\'")\s]+)', url)
    if not m:
        return None
    p = m.group(1).rstrip('/')
    return p

def main():
    assets = set()
    for local, src in PAGES.items():
        fp = os.path.join(BASE, src)
        if not os.path.exists(fp) or os.path.getsize(fp) < 1000:
            continue
        raw = open(fp, encoding='utf-8', errors='ignore').read()
        for pat in [r'https?://(?:www\.)?tresmarescapital\.com/[^"\'\s\)\\]+',
                    r'https?://www-tresmarescapital-com\.translate\.goog/[^"\'\s\)\\]+']:
            for u in re.findall(pat, raw):
                u = u.split('?_x_tr')[0]
                if re.search(r'\.(css|js|png|jpe?g|svg|webp|gif|woff2?|ttf|otf|eot|mp4|webm|ico|pdf|avif)(\?|$)', u, re.I):
                    assets.add(u)
    print(f'unique assets: {len(assets)}')

    ok, fail = 0, 0
    for u in sorted(assets):
        lp = local_path_for(u)
        if not lp:
            continue
        out = os.path.join(MIRROR, lp)
        if os.path.exists(out) and os.path.getsize(out) > 50:
            ok += 1
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        # strip ?ver= for download
        path_only = lp
        if fetch(path_only, out):
            ok += 1
        else:
            fail += 1
            print('FAIL:', u[:120])
        time.sleep(0.2)
    print(f'downloaded ok={ok} fail={fail}')

if __name__ == '__main__':
    main()
