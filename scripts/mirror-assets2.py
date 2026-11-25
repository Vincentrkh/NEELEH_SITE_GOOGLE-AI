#!/usr/bin/env python3
"""Download fonts + videos referenced in CSS/HTML; rewrite all pages for local serving."""
import re, os, subprocess, time

BASE = '/home/z/my-project/tresmares-analysis'
MIRROR = os.path.join(BASE, 'mirror')
PROXY = 'https://www-tresmarescapital-com.translate.goog/{path}?_x_tr_sl=es&_x_tr_tl=en&_x_tr_hl=en'

def fetch(path, out):
    url = PROXY.format(path=path)
    r = subprocess.run(['curl', '-s', '--max-time', '90', '-L', url, '-o', out, '-w', '%{http_code}'],
                       capture_output=True, text=True)
    ok = r.stdout.strip() == '200' and os.path.exists(out) and os.path.getsize(out) > 100
    if not ok and os.path.exists(out):
        os.remove(out)
    return ok

def main():
    # 1. fonts from CSS
    css_fp = os.path.join(MIRROR, 'wp-content/cache/min/1/wp-content/themes/tresmares/style.css')
    css = open(css_fp, encoding='utf-8', errors='ignore').read()
    fonts = set(re.findall(r'themes/tresmares/fonts/([\w.-]+)', css))
    print('fonts referenced:', len(fonts))
    okf = 0
    for f in sorted(fonts):
        out = os.path.join(MIRROR, 'wp-content/themes/tresmares/fonts', f)
        if os.path.exists(out) and os.path.getsize(out) > 100:
            okf += 1
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if fetch(f'wp-content/themes/tresmares/fonts/{f}', out):
            okf += 1
        else:
            print('FONT FAIL:', f)
        time.sleep(0.2)
    print('fonts ok:', okf, '/', len(fonts))

    # 2. videos referenced in any downloaded page HTML
    vids = set()
    for name in os.listdir(BASE):
        if name.endswith('.html'):
            raw = open(os.path.join(BASE, name), encoding='utf-8', errors='ignore').read()
            for u in re.findall(r'https?://[^"\'\s>]+?\.(?:mp4|webm)[^"\'\s>]*', raw):
                vids.add(u.split('?_x_tr')[0])
    # also mp4 refs inside theme JS (video lazyload)
    js_fp = os.path.join(MIRROR, 'wp-content/themes/tresmares/js/app.min.js')
    if os.path.exists(js_fp):
        js = open(js_fp, encoding='utf-8', errors='ignore').read()
        for u in re.findall(r'https?://[^"\'\s]+?\.(?:mp4|webm)', js):
            vids.add(u)
    print('videos found:', len(vids))
    okv = 0
    for u in sorted(vids):
        m = re.search(r'tresmarescapital\.com/([^?\'")\s]+)', u)
        if not m:
            continue
        p = m.group(1)
        out = os.path.join(MIRROR, p)
        if os.path.exists(out) and os.path.getsize(out) > 100:
            okv += 1
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if fetch(p, out):
            okv += 1
            print('VID OK:', p[:80], os.path.getsize(out))
        else:
            print('VID FAIL:', u[:110])
        time.sleep(0.3)
    print('videos ok:', okv, '/', len(vids))

if __name__ == '__main__':
    main()
