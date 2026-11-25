#!/usr/bin/env python3
"""Full-site audit v2: any Persian character in a non-comment line that isn't
already part of lang-aware handling. Catches JSX text nodes (not quoted)."""
import re
from pathlib import Path

FA = re.compile(r"[\u0600-\u06FF\u06F0-\u06F9]")
ROOT = Path("/home/z/my-project/src")

def is_comment_line(line: str) -> bool:
    t = line.strip()
    return t.startswith("//") or t.startswith("/*") or t.startswith("*") or t.startswith("{/*")

for p in sorted(ROOT.rglob("*.tsx")) + sorted(ROOT.rglob("*.ts")):
    if "/api/" in str(p) or p.name.startswith("i18n"):
        continue
    hits = []
    lines = p.read_text().splitlines()
    for i, line in enumerate(lines, 1):
        if not FA.search(line):
            continue
        if is_comment_line(line):
            continue
        if re.search(r'lang\s*===\s*"(fa|en)"|isFa\s*\?|\bfa\s*\?|\bisRTL\s*\?|localeNumber|localeDate|localePrice|tierLabel|postStatusLabel|regLabel|paymentLabel', line):
            continue
        hits.append(i)
    if hits:
        print(f"{p.relative_to(ROOT)}: {hits}")
