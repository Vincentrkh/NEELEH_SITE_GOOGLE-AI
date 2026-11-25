#!/usr/bin/env python3
"""Live-measure revealed trail width by reading the canvas alpha row.

Tight protocol: reload -> wait -> 3 mouse moves -> readback, all chained in
ONE shell line so the trail cannot heal before readPixels runs.
alpha < 200 => mask transparent => revealed.
"""
import subprocess, json, re

JS = (
    '(() => {'
    "const c = document.querySelector('canvas[data-fluid-canvas]');"
    "if (!c) return 'NO CANVAS';"
    "const gl = c.getContext('webgl2');"
    "if (!gl) return 'NO GL';"
    "const glY = c.height - 420;"
    "const x0 = 200, w = 1200;"
    "const buf = new Uint8Array(w * 4);"
    "gl.readPixels(x0, glY, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);"
    "const xs = [];"
    "for (let i = 0; i < w; i++) if (buf[i*4+3] < 200) xs.push(i + x0);"
    "if (!xs.length) return JSON.stringify({extent: 0, count: 0});"
    "return JSON.stringify({extent: xs[xs.length-1]-xs[0]+1, count: xs.length,"
    " from: xs[0], to: xs[xs.length-1]});"
    '})()'
)

def run(cmd, timeout=180):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                       timeout=timeout)
    return r.stdout.strip()

results = {}
for name, val in {"min": "0.0002", "default": "0.004", "max": "0.02"}.items():
    out = run(
        f'agent-browser storage local set fluid-brush-radius {val} && '
        f'agent-browser reload && agent-browser wait --load networkidle && '
        f'agent-browser eval "window.scrollTo(0,0)" && '
        f'agent-browser wait 3500 && '
        f'agent-browser mouse move 400 420 && '
        f'agent-browser mouse move 525 420 && '
        f'agent-browser mouse move 650 420 && '
        f'agent-browser mouse move 775 420 && '
        f'agent-browser mouse move 900 420 && '
        f'agent-browser eval "{JS}"'
    )
    m = re.search(r'\{"extent"[^\}]*\}', out, re.S)
    results[name] = m.group(0).replace("\n", "") if m else "RAW: " + out[-300:]
    print(f"{name:8s} radius={val:7s} -> {results[name]}")

d = {}
for k, v in results.items():
    try:
        d[k] = json.loads(v)
    except Exception:
        print(f"[warn] could not parse {k}: {v[:120]}")
if "min" in d and "max" in d and d["min"].get("count"):
    print(f"\nmax/min revealed-pixel ratio: {d['max']['count']/d['min']['count']:.2f}x "
          f"(theory ~sqrt(100)=10x)")
if "min" in d and "default" in d and d["min"].get("count"):
    print(f"default/min revealed-pixel ratio: {d['default']['count']/d['min']['count']:.2f}x "
          f"(theory ~sqrt(20)=4.5x)")
