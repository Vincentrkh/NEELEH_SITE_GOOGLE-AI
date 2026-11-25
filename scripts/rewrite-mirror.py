#!/usr/bin/env python3
"""Rewrite mirrored Tresmares pages: strip Google Translate injection, localize URLs, stub YouTube API."""
import re, os

BASE = '/home/z/my-project/tresmares-analysis'
MIRROR = os.path.join(BASE, 'mirror')

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

YT_STUB = '<script>window.YT=window.YT||{Player:function(){return this},loaded:0};window.onYouTubeIframeAPIReady=function(){};</script>'

def rewrite(raw):
    # 1. drop gstatic translate scripts
    raw = re.sub(r'<script[^>]+src="https://www\.gstatic\.com/_/translate_http/[^"]*"[^>]*>\s*</script>', '', raw)
    raw = re.sub(r'<script[^>]+src="https://translate\.googleapis\.com[^"]*"[^>]*>\s*</script>', '', raw)
    # 2. drop translate injected noscript/style for banner
    raw = re.sub(r'<iframe[^>]+goog-te-banner-frame[^>]*>.*?</iframe>', '', raw, flags=re.S)
    raw = re.sub(r'<div[^>]+id="goog-gt-[^\"]*"[^>]*>.*?</div>', '', raw, flags=re.S)
    # 3. rewrite translate.goog internal links -> local path
    def repl_trans(m):
        path = m.group(1)
        return '/' + path
    raw = re.sub(r'https?://www-tresmarescapital-com\.translate\.goog/([^"\'\s\)\\#?]*)(\?[^"\'\s\)\\#]*)?', repl_trans, raw)
    # 4. rewrite origin URLs -> local
    raw = re.sub(r'https?://(?:www\.)?tresmarescapital\.com/', '/', raw)
    # 5. youtube api -> stub immediately before first theme script
    raw = re.sub(r'(<script[^>]+src="[^"]*vendor\.min\.js[^"]*"[^>]*>\s*</script>)', YT_STUB + r'\1', raw, count=1)
    # also remove direct youtube iframe_api script tag (loads from YT)
    raw = re.sub(r'<script[^>]+src="https://www\.youtube\.com/iframe_api[^"]*"[^>]*>\s*</script>', '', raw)
    return raw

def main():
    done = 0
    for local, src in PAGES.items():
        fp = os.path.join(BASE, src)
        if not os.path.exists(fp) or os.path.getsize(fp) < 1000:
            print('SKIP', src)
            continue
        raw = open(fp, encoding='utf-8', errors='ignore').read()
        out = rewrite(raw)
        dst = os.path.join(MIRROR, local)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'w', encoding='utf-8').write(out)
        done += 1
        print('WROTE', local, len(out))
    print('pages written:', done)

if __name__ == '__main__':
    main()
