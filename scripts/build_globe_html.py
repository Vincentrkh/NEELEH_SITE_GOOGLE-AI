# -*- coding: utf-8 -*-
"""
build_globe_html.py — ساخت public/neeleh-bim-globe.html از فایل پیوست طراح.
تغییرات نسبت به پیوست:
  1) importmap → /vendor/three (بدون CDN)
  2) کانفیگ پیش‌فرض = NEELEH BIM Globe v3 کاربر (bake شده)
  3) حذف کامل پنل تنظیمات + localStorage + دکمه‌ها (پنل به داشبورد منتقل شده)
  4) حالت embed (?embed=1): بدون عنوان/hint، wheel→اسکرول والد، لمسی→اسکرول،
     فوروارد pointermove برای کرسر والد
  5) بوت: fetch('/api/tm/globe-config') → applyConfig
  6) postMessage: neeleh-globe:apply (لایو از داشبورد) + neeleh-globe:getCamera
  7) لوگو از کانفیگ (logoDataUri) به‌جای file input
"""
import re, sys, subprocess, tempfile, os

SRC = "upload/index (1).html"
DST = "public/neeleh-bim-globe.html"

html = open(SRC, encoding="utf-8").read()
orig_len = len(html)

def cut(start_anchor: str, end_anchor: str, keep_end: bool = False):
    """حذف متن بین دو انکر (شامل start، شامل end مگر keep_end)"""
    global html
    i = html.find(start_anchor)
    assert i >= 0, f"start anchor not found: {start_anchor[:60]!r}"
    j = html.find(end_anchor, i + len(start_anchor))
    assert j >= 0, f"end anchor not found: {end_anchor[:60]!r}"
    if not keep_end:
        j += len(end_anchor)
    html = html[:i] + html[j:]

def replace_once(old: str, new: str):
    global html
    assert html.count(old) == 1, f"anchor not unique ({html.count(old)}x): {old[:70]!r}"
    html = html.replace(old, new)

# ─────────────────────────── 1) CSS ───────────────────────────
# پنل، دکمه‌ها، toggle، exportBox، panel-wrap — حذف
cut("    .panel {\n", "    .panel h3:first-child { margin-top: 0; }\n")
cut("    .panel label { display: block;", "    .btn.green:hover { background: #268557; }\n")
cut("    #exportBox {", "    .panel { position: relative; top: 0; right: 0; margin-top: 48px; }\n")

# CSS حالت embed
replace_once(
    "  </style>",
    """    /* حالت embed (iframe هرو / پیش‌نمایش داشبورد با ?embed=1):
       عنوان و hint مخفی — صحنهٔ خالص گلوب */
    body.embed .title, body.embed .hint { display: none !important; }
  </style>""",
)

# ─────────────────────────── 2) HTML ───────────────────────────
# کل پنل حذف
cut('  <div class="panel-wrap">', '  <script type="importmap">', keep_end=True)

# اسکریپت زودهنگام embed + متن hint بدون پنل
replace_once(
    "<body>\n",
    """<body>
  <!-- حالت embed از اولین فریم اعمال می‌شود -->
  <script>
    if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed');
  </script>
""",
)
replace_once(
    '<div class="hint">SCROLL TO ZOOM CENTER · DRAG TO ORBIT · [ ] TOGGLE PANEL</div>',
    '<div class="hint">DRAG TO ORBIT · SCROLL TO ZOOM</div>',
)

# ─────────────────────────── 3) importmap ───────────────────────────
replace_once('"three": "https://unpkg.com/three@0.160.0/build/three.module.js"', '"three": "/vendor/three/three.module.js"')
replace_once('"three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"', '"three/addons/": "/vendor/three/addons/"')

# ─────────────────────────── 4) کانفیگ v3 ───────────────────────────
replace_once(
    """    // ===== DEFAULTS FROM USER CONFIG =====
    const DEFAULT_CAM_POS = [2.2320089509586025, 2.3645541470170865, 0.846254604664599];
    const DEFAULT_CAM_TARGET = [0.26211920516860615, 0.9213495371236436, -0.6183379675067368];""",
    """    // ===== DEFAULTS FROM USER CONFIG (NEELEH BIM Globe v3) =====
    // با کانفیگ ذخیره‌شدهٔ داشبورد (/api/tm/globe-config) بازنویسی می‌شود
    const DEFAULT_CAM_POS = [-0.008173757636904921, 3.008964279209981, -2.3044464670854534];
    const DEFAULT_CAM_TARGET = [-0.451857224930518, 1.4195397703238435, -0.7066721535814591];""",
)

replace_once(
    """    const S = {
      bgColor:'#f2f2f2', shellColor:'#858585', shellOpacity:0.05, autoRotate:1, fogFar:35,
      gridStyle:'dashed', dashLen:1, gapLen:1, gridThick:0.7, latCount:22, lonCount:15,
      gridColor:'#000000', gridOpacity:0.65, eqColor:'#4a90d0', eqThick:5,
      gridDensity:5, pointSize:1, pointColor:'#000000', pointOpacity:0.7, pointStyle:'point', pointStroke:1.5,
      fontFamily:'Arial', labelSize:1.95, aiLabelSize:1.2, bimSize:3,
      swColor:'#3a5a40', aiColor:'#2a6a9a', bimColor:'#1a4a80', bimText:'BIM',
      labelStroke:0.3, labelStrokeColor:'#ffffff', labelSeed:57715,
      showIcons:true, iconCount:10, iconMouseFx:0.8, iconSize:1.2, iconStroke:1.3, iconColor:'#3a7ec8', iconFillOp:0.15,
      cometCount:24, cometSpeed:1.7, trailLen:20, cometBright:0.85, cometSize:0.5,
      cometColorA:'#4a9aef', cometColorB:'#90c4ff', cometOffset:0.02,
      fgEnabled:true, fgType:'linear',
      fgC1:'#ffffff', fgA1:0, fgC2:'#ffffff', fgA2:0.75, fgC3:'#ffffff', fgA3:1,
      fgX:0, fgY:0, fgSpread:120, fgAngle:184,

      logoScale:1, logoSpin:1, coreVisible:true, fov:25, zoomSpeed:1
    };""",
    """    const S = {
      bgColor:'#ffffff', shellColor:'#ffffff', shellOpacity:0, autoRotate:1, fogFar:8,
      gridStyle:'solid', dashLen:14.31, gapLen:22.68, gridThick:0.7, latCount:18, lonCount:17,
      gridColor:'#000000', gridOpacity:0.27, eqColor:'#4a90d0', eqThick:5,
      gridDensity:5, pointSize:0.38, pointColor:'#000000', pointOpacity:0.7, pointStyle:'point', pointStroke:1.5,
      fontFamily:'Arial', labelSize:1.95, aiLabelSize:1.2, bimSize:3,
      swColor:'#3a5a40', aiColor:'#2a6a9a', bimColor:'#1a4a80', bimText:'BIM',
      labelStroke:0.3, labelStrokeColor:'#ffffff', labelSeed:57715,
      showIcons:true, iconCount:10, iconMouseFx:0.8, iconSize:1.2, iconStroke:1.3, iconColor:'#3a7ec8', iconFillOp:0.15,
      cometCount:24, cometSpeed:1.7, trailLen:40, cometBright:0.85, cometSize:0.5,
      cometColorA:'#ff0000', cometColorB:'#0062ff', cometOffset:0.02,
      fgEnabled:true, fgType:'linear',
      fgC1:'#ffffff', fgA1:0, fgC2:'#ffffff', fgA2:0.75, fgC3:'#ffffff', fgA3:1,
      fgX:0, fgY:0, fgSpread:120, fgAngle:184,

      logoScale:2.25, logoSpin:1, coreVisible:false, fov:25, zoomSpeed:1,

      // لوگو سه‌بعدی مرکز کره — از داشبورد (dataURI فایل GLB/GLTF)
      logoDataUri: ''
    };""",
)

# ─────────────────────────── 5) حذف localStorage boot ───────────────────────────
cut(
    """    const STORAGE_KEY = 'neeleh-bim-globe-defaults-v3';
    const FACTORY_S = JSON.parse(JSON.stringify(S));
    const FACTORY_CAM_POS = DEFAULT_CAM_POS.slice();
    const FACTORY_CAM_TARGET = DEFAULT_CAM_TARGET.slice();

    function loadSaved() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }

    const savedBoot = loadSaved();
    if (savedBoot && savedBoot.settings) {
      Object.keys(savedBoot.settings).forEach(k => {
        if (savedBoot.settings[k] !== undefined) S[k] = savedBoot.settings[k];
      });
    }
    if (savedBoot && savedBoot.camera) {
      if (Array.isArray(savedBoot.camera.position) && savedBoot.camera.position.length === 3) {
        DEFAULT_CAM_POS[0] = savedBoot.camera.position[0];
        DEFAULT_CAM_POS[1] = savedBoot.camera.position[1];
        DEFAULT_CAM_POS[2] = savedBoot.camera.position[2];
      }
      if (Array.isArray(savedBoot.camera.target) && savedBoot.camera.target.length === 3) {
        DEFAULT_CAM_TARGET[0] = savedBoot.camera.target[0];
        DEFAULT_CAM_TARGET[1] = savedBoot.camera.target[1];
        DEFAULT_CAM_TARGET[2] = savedBoot.camera.target[2];
      }
      if (savedBoot.camera.fov != null) S.fov = savedBoot.camera.fov;
    }


""",
    "",
)

# ─────────────────────────── 6) EMBED const + pointermove فوروارد ───────────────────────────
replace_once(
    """    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    const BIM_SW""",
    """    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    // ===== حالت EMBED — اجرا داخل iframe هرو / پیش‌نمایش داشبورد (?embed=1) =====
    const EMBED = new URLSearchParams(location.search).get('embed') === '1';

    const BIM_SW""",
)

replace_once(
    """    let mouseX = 0.5, mouseY = 0.5, mouseTX = 0.5, mouseTY = 0.5;
    addEventListener('pointermove', e => {
      mouseTX = e.clientX / innerWidth;
      mouseTY = e.clientY / innerHeight;
    });
    const canvas = document.getElementById('c');
    const svgOverlay = document.getElementById('svgOverlay');
    const fgEl = document.getElementById('fgGradient');
    const panel = document.getElementById('panel');

    // Toggle panel
    let panelVisible = true;
    function setPanel(v) {
      panelVisible = v;
      panel.classList.toggle('hidden', !v);
      document.getElementById('togglePanel').textContent = v ? '⚙' : '☰';
    }
    document.getElementById('togglePanel').onclick = () => setPanel(!panelVisible);
    addEventListener('keydown', e => {
      if (e.key === ']' || e.key === '[') { e.preventDefault(); setPanel(!panelVisible); }
    });
""",
    """    let mouseX = 0.5, mouseY = 0.5, mouseTX = 0.5, mouseTY = 0.5;
    addEventListener('pointermove', e => {
      mouseTX = e.clientX / innerWidth;
      mouseTY = e.clientY / innerHeight;
      if (EMBED) {
        // فوروارد حرکت موس به والد تا کرسر سفارشی سایت روی هرو هم حرکت کند
        try {
          const r = window.frameElement && window.frameElement.getBoundingClientRect();
          if (r && window.parent) {
            window.parent.dispatchEvent(new MouseEvent('mousemove', {
              clientX: e.clientX + r.left, clientY: e.clientY + r.top, bubbles: true
            }));
          }
        } catch (_) { /* noop */ }
      }
    });
    const canvas = document.getElementById('c');
    const svgOverlay = document.getElementById('svgOverlay');
    const fgEl = document.getElementById('fgGradient');
""",
)

# ─────────────────────────── 7) OrbitControls: لمسی ───────────────────────────
replace_once(
    "    controls.enableZoom = false; // custom scroll zoom toward center\n",
    """    controls.enableZoom = false; // custom scroll zoom toward center

    // حالت embed روی دستگاه لمسی: چرخش با درگ خاموش تا سوایپ عمودی، صفحه را اسکرول کند
    if (EMBED && matchMedia('(pointer: coarse)').matches) {
      controls.enabled = false;
      canvas.style.touchAction = 'auto';
    }
""",
)

# ─────────────────────────── 8) wheel ───────────────────────────
replace_once(
    """    // Scroll zoom toward center (target)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY) * 0.12 * S.zoomSpeed;
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
      const dist = dir.length();
      const newDist = THREE.MathUtils.clamp(dist * (1 + delta), controls.minDistance, controls.maxDistance);
      dir.setLength(newDist);
      camera.position.copy(controls.target).add(dir);
    }, { passive: false });""",
    """    // Scroll zoom toward center (target) — در حالت embed: فوروارد به والد
    if (!EMBED) {
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 0.12 * S.zoomSpeed;
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
        const dist = dir.length();
        const newDist = THREE.MathUtils.clamp(dist * (1 + delta), controls.minDistance, controls.maxDistance);
        dir.setLength(newDist);
        camera.position.copy(controls.target).add(dir);
      }, { passive: false });
    } else {
      // داخل iframe: wheel باید صفحهٔ اصلی سایت را اسکرول کند (نه زوم گلوب).
      // اگر Lenis والد فعال باشد از همان مسیر نرم خودش، وگرنه scrollBy معمولی.
      addEventListener('wheel', (e) => {
        e.preventDefault();
        try {
          const p = window.parent;
          if (!p) return;
          if (p.__tmLenis) {
            p.dispatchEvent(new WheelEvent('wheel', {
              deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
              bubbles: true, cancelable: true
            }));
          } else {
            p.scrollBy(0, e.deltaY);
          }
        } catch (_) { /* noop */ }
      }, { passive: false });
    }""",
)

# ─────────────────────────── 9) لوگو از کانفیگ ───────────────────────────
replace_once(
    """    document.getElementById('logoFile').addEventListener('change',e=>{
      const file=e.target.files?.[0]; if(!file) return;
      const url=URL.createObjectURL(file);
      gltfLoader.load(url,gltf=>{
        clearLogo();
        const model=gltf.scene;
        const box=new THREE.Box3().setFromObject(model);
        const size=box.getSize(new THREE.Vector3());
        model.scale.setScalar(0.55/Math.max(size.x,size.y,size.z,1));
        box.setFromObject(model); model.position.sub(box.getCenter(new THREE.Vector3()));
        logoRoot.add(model); logoRoot.scale.setScalar(S.logoScale);
        URL.revokeObjectURL(url);
      },undefined,()=>alert('GLB load failed'));
    });
    document.getElementById('clearLogo').onclick=clearLogo;
""",
    """    // لوگو از کانفیگ (dataURI) — آپلود از داشبورد مدیریت
    function loadLogoFromUri(uri) {
      if (!uri) { clearLogo(); return; }
      try {
        gltfLoader.load(uri, gltf => {
          clearLogo();
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          model.scale.setScalar(0.55 / Math.max(size.x, size.y, size.z, 1));
          box.setFromObject(model); model.position.sub(box.getCenter(new THREE.Vector3()));
          logoRoot.add(model); logoRoot.scale.setScalar(S.logoScale);
        }, undefined, () => { /* bad uri — ignore */ });
      } catch (_) { /* noop */ }
    }
""",
)

# ─────────────────────────── 10) حذف bind/panel-JS/export ───────────────────────────
cut("    function fmt(n){ return (Math.round(Number(n)*100)/100).toFixed(2); }", "    // Initial form sync for loaded defaults\n    syncFormFromS();\n\n")
cut("    const box=document.getElementById('exportBox');", "    a.download='neeleh-bim-globe-config.json'; a.click();\n    };")

# ─────────────────────────── 11) applyConfig + boot + message ───────────────────────────
replace_once(
    "    function animate(){",
    """    // ===== اعمال کانفیگ (بوت از API یا لایو از داشبورد) =====
    function applyConfig(payload) {
      if (!payload || typeof payload !== 'object') return;
      const st = (payload.settings && typeof payload.settings === 'object') ? payload.settings : {};
      const cam = (payload.camera && typeof payload.camera === 'object') ? payload.camera : {};

      Object.keys(st).forEach(k => {
        if (st[k] !== undefined && st[k] !== null) S[k] = st[k];
      });

      if (Array.isArray(cam.position) && cam.position.length === 3) {
        DEFAULT_CAM_POS[0] = Number(cam.position[0]) || DEFAULT_CAM_POS[0];
        DEFAULT_CAM_POS[1] = Number(cam.position[1]) || DEFAULT_CAM_POS[1];
        DEFAULT_CAM_POS[2] = Number(cam.position[2]) || DEFAULT_CAM_POS[2];
      }
      if (Array.isArray(cam.target) && cam.target.length === 3) {
        DEFAULT_CAM_TARGET[0] = Number(cam.target[0]) || DEFAULT_CAM_TARGET[0];
        DEFAULT_CAM_TARGET[1] = Number(cam.target[1]) || DEFAULT_CAM_TARGET[1];
        DEFAULT_CAM_TARGET[2] = Number(cam.target[2]) || DEFAULT_CAM_TARGET[2];
      }

      renderer.setClearColor(S.bgColor, 1);
      scene.fog.color.set(S.bgColor);
      scene.fog.far = S.fogFar;
      shellMat.color.set(S.shellColor);
      shellMat.opacity = S.shellOpacity;
      rebuildGrid();
      rebuildPoints();
      rebuildSVGLabels();
      buildComets();
      updateFG();
      logoRoot.scale.setScalar(S.logoScale);
      core.visible = !!S.coreVisible;
      camera.fov = S.fov;
      camera.updateProjectionMatrix();
      camera.position.fromArray(DEFAULT_CAM_POS);
      controls.target.fromArray(DEFAULT_CAM_TARGET);
      controls.update();
      loadLogoFromUri(typeof S.logoDataUri === 'string' ? S.logoDataUri : '');
    }

    // بوت: کانفیگ ذخیره‌شدهٔ داشبورد (بدون کش)
    (async () => {
      try {
        const res = await fetch('/api/tm/globe-config', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && (data.settings || data.camera)) applyConfig(data);
      } catch (_) { /* آفلاین/بدون API → همان پیش‌فرض‌های bake شده */ }
    })();

    // پیام‌های داشبورد: apply لایو + گزارش دوربین
    addEventListener('message', (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'neeleh-globe:apply') {
        applyConfig(d);
      } else if (d.type === 'neeleh-globe:getCamera' && window.parent) {
        try {
          window.parent.postMessage({
            type: 'neeleh-globe:camera',
            camera: {
              position: camera.position.toArray(),
              target: controls.target.toArray(),
              fov: camera.fov
            }
          }, '*');
        } catch (_) { /* noop */ }
      }
    });

    function animate(){""",
)

# ─────────────────────────── نوشتن + بررسی ───────────────────────────
open(DST, "w", encoding="utf-8").write(html)
print(f"OK: {SRC} ({orig_len} chars) → {DST} ({len(html)} chars)")

# بررسی: ماژول اسکریپت سینتکس معتبر دارد؟
m = re.search(r'<script type="module">(.*?)</script>', html, re.S)
assert m, "module script not found"
js = m.group(1)
with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as f:
    f.write(js)
    tmp = f.name
r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
os.unlink(tmp)
if r.returncode != 0:
    print("JS SYNTAX ERROR:\n", r.stderr[:3000])
    sys.exit(1)
print("JS syntax OK")

# ادعاهای نهایی
checks = {
    "no panel html": 'panel-wrap' not in html and 'togglePanel' not in html,
    "no localStorage": 'localStorage' not in html,
    "no bind(": 'bind(' not in html,
    "vendor importmap": '/vendor/three/three.module.js' in html,
    "EMBED const": "const EMBED = new URLSearchParams" in html,
    "wheel forward": "p.dispatchEvent(new WheelEvent" in html,
    "pointermove forward": "dispatchEvent(new MouseEvent" in html,
    "applyConfig": "function applyConfig(" in html,
    "boot fetch": "fetch('/api/tm/globe-config'" in html,
    "message listener": "'neeleh-globe:apply'" in html and "'neeleh-globe:getCamera'" in html,
    "logo uri": "function loadLogoFromUri(" in html,
    "v3 camera": "-0.008173757636904921" in html,
    "v3 config": "logoScale:2.25" in html and "trailLen:40" in html,
    "embed css": "body.embed .title" in html,
    "no export box": "exportBox" not in html,
}
bad = [k for k, v in checks.items() if not v]
for k, v in checks.items():
    print(("  ✓ " if v else "  ✗ ") + k)
if bad:
    sys.exit(1)
print("ALL CHECKS PASSED")
