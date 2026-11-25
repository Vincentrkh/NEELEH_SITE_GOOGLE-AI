"use client";

import * as React from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   TM Animated Architectural SVG Art Library
   ───────────────────────────────────────────────────────────────────────────
   Every visual across the Tres Mares skin is a 100% custom animated SVG
   tailored to Neeleh Architecture Academy:
     • Continuous GPU keyframes + Framer Motion parallax & hover reactivity
     • Regional crimson highlight dots + floating card on the Halftone Map
     • Minimalist monochrome charcoal & crimson engraving aesthetic
   ═══════════════════════════════════════════════════════════════════════════ */

const CHARCOAL = "#2b2b2b";
const GRID_LINE = "rgba(43, 43, 43, 0.12)";
const RED = "#e41613";

/* ── 1. Mega-Menu Submenu Animated Architectural Backdrops ──────────────── */

export type TmSubmenuKind = "beginner" | "intermediate" | "pro" | "compare";

export function TmSubmenuSvg({ kind }: { kind: TmSubmenuKind }) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="tm-mega__svg"
      aria-hidden="true"
    >
      <rect width="400" height="300" fill="#dcdcdc" />
      <g stroke={CHARCOAL} strokeOpacity="0.14" strokeWidth="1" fill="none">
        {[60, 120, 180, 240].map((y) => (
          <line key={`h-${y}`} x1="0" y1={y} x2="400" y2={y} />
        ))}
        {[80, 160, 240, 320].map((x) => (
          <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="300" />
        ))}
      </g>

      {kind === "beginner" && (
        <g stroke={CHARCOAL} strokeWidth="1.25" fill="none" strokeOpacity="0.38">
          <rect x="48" y="42" width="304" height="216" />
          <path d="M 48 150 H 190 M 190 42 V 258 M 225 90 H 352" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={225 + i * 15} y1="90" x2={225 + i * 15} y2="165" />
          ))}
          <path
            className="tm-svg-pulse"
            d="M 110 150 A 45 45 0 0 1 155 195"
            stroke={RED}
            strokeOpacity="0.72"
            strokeWidth="1.6"
          />
          <circle className="tm-svg-pulse" cx="190" cy="150" r="3.5" fill={RED} stroke="none" />
        </g>
      )}

      {kind === "intermediate" && (
        <g stroke={CHARCOAL} strokeWidth="1.25" fill="none" strokeOpacity="0.38">
          <polygon className="tm-svg-float-slow" points="200,36 330,104 200,172 70,104" />
          <polygon points="200,88 330,156 200,224 70,156" />
          <polygon className="tm-svg-float-reverse" points="200,140 330,208 200,276 70,208" />
          <line x1="70" y1="104" x2="70" y2="208" />
          <line x1="330" y1="104" x2="330" y2="208" />
          <line
            className="tm-svg-dash-slow"
            strokeDasharray="5 4"
            x1="200"
            y1="172"
            x2="200"
            y2="276"
            stroke={RED}
            strokeOpacity="0.78"
          />
        </g>
      )}

      {kind === "pro" && (
        <g stroke={CHARCOAL} strokeWidth="1.15" fill="none" strokeOpacity="0.38">
          {Array.from({ length: 7 }).map((_, i) => {
            const dx = i * 26;
            return (
              <path
                key={i}
                className={i % 2 === 0 ? "tm-svg-float-slow" : "tm-svg-float-reverse"}
                d={`M ${50 + dx} 240 Q 200 ${20 + i * 14}, ${350 - dx * 0.4} 230`}
              />
            );
          })}
          <circle className="tm-svg-beacon-ring" cx="200" cy="112" r="14" stroke={RED} strokeOpacity="0.35" />
          <circle cx="200" cy="112" r="5" fill={RED} stroke="none" />
          <line className="tm-svg-dash-slow" strokeDasharray="4 3" x1="132" y1="158" x2="200" y2="112" stroke={RED} strokeOpacity="0.65" />
          <line className="tm-svg-dash-reverse" strokeDasharray="4 3" x1="268" y1="148" x2="200" y2="112" stroke={RED} strokeOpacity="0.65" />
        </g>
      )}

      {kind === "compare" && (
        <g stroke={CHARCOAL} strokeWidth="1.15" fill="none" strokeOpacity="0.38">
          <rect x="44" y="48" width="136" height="204" />
          <rect x="220" y="48" width="136" height="204" />
          {[96, 128, 160, 192, 224].map((y) => (
            <React.Fragment key={y}>
              <line x1="66" y1={y} x2="158" y2={y} />
              <line x1="242" y1={y} x2="334" y2={y} />
            </React.Fragment>
          ))}
          <line className="tm-svg-dash-slow" x1="184" y1="150" x2="216" y2="150" stroke={RED} strokeWidth="1.8" strokeDasharray="3 3" />
        </g>
      )}
    </svg>
  );
}

/* ── 3. Strategy Stage Animated Monochrome Engraving Sculptures ─────────── */

export function TmStrategySculptureSvg({
  variant,
}: {
  variant: "drafting" | "bim" | "parametric" | "ai";
}) {
  return (
    <svg
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMidYMid slice"
      className="tm-strategy__sculpture-svg"
      aria-hidden="true"
    >
      {variant === "drafting" && (
        <g stroke="#2b2b2b" fill="none" strokeLinecap="round">
          <path
            d="M 596 890 C 594 640, 608 420, 616 70"
            strokeWidth="4.2"
            strokeOpacity="0.88"
          />
          <g className="tm-svg-sway">
            <path
              d="M 616 70 L 656 105 M 616 70 L 570 98 M 610 155 L 710 122 M 608 265 L 440 218 M 604 375 L 748 332 M 602 510 L 456 575 M 600 660 L 732 612"
              strokeWidth="2.4"
              strokeOpacity="0.8"
            />
            {[
              [640, 88, 668, 72],
              [705, 122, 745, 114],
              [442, 218, 398, 204],
              [742, 334, 786, 355],
              [460, 574, 412, 608],
              [726, 615, 774, 595],
            ].map(([x1, y1, x2, y2], idx) => (
              <g key={idx}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.5" strokeOpacity="0.7" />
                <circle className="tm-svg-pulse" cx={x2} cy={y2} r="6.5" fill="#2b2b2b" fillOpacity="0.78" stroke="none" />
              </g>
            ))}
          </g>
          <rect className="tm-svg-dash-slow" x="490" y="180" width="220" height="480" strokeWidth="1" strokeOpacity="0.24" strokeDasharray="4 6" />
          <circle className="tm-svg-spin-slow" style={{ transformOrigin: "606px 410px" }} cx="606" cy="410" r="145" strokeWidth="0.9" strokeOpacity="0.18" strokeDasharray="12 10" />
        </g>
      )}

      {variant === "bim" && (
        <g stroke="#2b2b2b" fill="none">
          <circle className="tm-svg-beacon-ring" cx="775" cy="272" r="24" strokeWidth="2.4" strokeOpacity="0.85" />
          <circle cx="775" cy="272" r="7" fill="#2b2b2b" stroke="none" />
          <line x1="775" y1="272" x2="1220" y2="-10" strokeWidth="6.5" strokeOpacity="0.85" />
          <g className="tm-svg-spin-slow" style={{ transformOrigin: "775px 272px" }}>
            {Array.from({ length: 34 }).map((_, i) => {
              const ang = 1.85 + i * 0.105;
              const len = 180 + ((i * 53) % 270);
              const x2 = Number((775 + Math.cos(ang) * len).toFixed(2));
              const y2 = Number((272 + Math.sin(ang) * len).toFixed(2));
              const cx = Number((x2 * 0.72 + 775 * 0.28).toFixed(2));
              const cy = Number((y2 * 0.72 + 272 * 0.28).toFixed(2));
              const op = Number((0.38 + (i % 3) * 0.18).toFixed(2));
              return (
                <g key={i}>
                  <line
                    x1="775"
                    y1="272"
                    x2={x2}
                    y2={y2}
                    strokeWidth={i % 4 === 0 ? "1.6" : "0.85"}
                    strokeOpacity={op}
                  />
                  {i % 2 === 0 && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3 + (i % 3)}
                      strokeWidth="1.2"
                      strokeOpacity="0.65"
                    />
                  )}
                </g>
              );
            })}
          </g>
        </g>
      )}

      {variant === "parametric" && (
        <g stroke="#2b2b2b" fill="none">
          <path
            className="tm-svg-float-slow"
            d="M 410 900 C 440 580, 390 280, 505 30 C 660 25, 810 150, 795 390 C 780 610, 620 780, 540 900 Z"
            fill="#e6e6e6"
            fillOpacity="0.34"
            strokeWidth="1.8"
            strokeOpacity="0.6"
          />
          <g className="tm-svg-sway">
            {Array.from({ length: 24 }).map((_, i) => {
              const p = i * 16;
              return (
                <path
                  key={i}
                  d={`M ${435 + p * 0.55} 890 C ${470 + p * 0.35} ${620 - i * 8}, ${480 + p * 0.8} ${320 + i * 6}, ${530 + p * 0.9} ${70 + i * 14}`}
                  strokeWidth="0.95"
                  strokeOpacity={0.28 + (i % 4) * 0.14}
                />
              );
            })}
            {Array.from({ length: 14 }).map((_, j) => {
              const y = 130 + j * 54;
              return (
                <path
                  key={`lat-${j}`}
                  d={`M 430 ${y} Q 610 ${y + 38}, 785 ${y - 18}`}
                  strokeWidth="0.8"
                  strokeOpacity="0.22"
                />
              );
            })}
          </g>
        </g>
      )}

      {variant === "ai" && (
        <g stroke="#2b2b2b" fill="none">
          <path d="M 520 900 C 555 680, 600 440, 740 120" strokeWidth="5.5" strokeOpacity="0.72" />
          <path d="M 505 900 C 535 660, 575 410, 665 180" strokeWidth="3.5" strokeOpacity="0.55" />
          <g className="tm-svg-float-reverse">
            {Array.from({ length: 20 }).map((_, i) => {
              const y = 210 + i * 32;
              const x = 710 - i * 9;
              const dir = i % 2 === 0 ? 1 : -1;
              return (
                <g key={i}>
                  <path
                    d={`M ${x} ${y} Q ${x + dir * (40 + (i % 4) * 20)} ${y - 35}, ${x + dir * (72 + (i % 3) * 22)} ${y - 82}`}
                    strokeWidth="1.4"
                    strokeOpacity="0.65"
                  />
                  <circle
                    className="tm-svg-pulse"
                    cx={x + dir * (72 + (i % 3) * 22)}
                    cy={y - 82}
                    r="3.4"
                    fill="#2b2b2b"
                    fillOpacity="0.55"
                    stroke="none"
                  />
                </g>
              );
            })}
          </g>
        </g>
      )}
    </svg>
  );
}

/* ── 4. Animated Monochrome Architectural Plates (Footer, Values, Cards) ─ */

export type TmPlateVariant = "drafting" | "bim" | "parametric" | "ai" | "atelier";

export function TmArchitecturalPlate({
  variant,
  className = "",
}: {
  variant: TmPlateVariant;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 640 480"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full block ${className}`}
      aria-hidden="true"
    >
      <rect width="640" height="480" fill="#ebebea" />
      <g stroke={GRID_LINE} strokeWidth="1">
        {[80, 160, 240, 320, 400].map((y) => (
          <line key={`hy-${y}`} x1="0" y1={y} x2="640" y2={y} />
        ))}
        {[106, 212, 320, 428, 534].map((x) => (
          <line key={`vx-${x}`} x1={x} y1="0" x2={x} y2="480" />
        ))}
      </g>

      {variant === "drafting" && (
        <g stroke={CHARCOAL} fill="none">
          <rect x="96" y="76" width="448" height="328" strokeWidth="1.6" strokeOpacity="0.72" />
          <rect x="132" y="112" width="180" height="140" strokeWidth="1.2" strokeOpacity="0.52" />
          <rect x="336" y="112" width="172" height="256" strokeWidth="1.2" strokeOpacity="0.52" />
          <path className="tm-svg-pulse" d="M 132 252 H 212 A 80 80 0 0 0 132 332 Z" strokeWidth="1.5" stroke={RED} strokeOpacity="0.75" />
          <line className="tm-svg-drift-x" x1="96" y1="54" x2="544" y2="54" strokeOpacity="0.45" strokeWidth="1.3" />
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={i}
              x1="358"
              y1={144 + i * 20}
              x2="486"
              y2={144 + i * 20}
              strokeOpacity="0.55"
              strokeWidth="1.1"
            />
          ))}
        </g>
      )}

      {variant === "bim" && (
        <g stroke={CHARCOAL} fill="none">
          <polygon className="tm-svg-float-slow" points="320,66 510,162 320,258 130,162" strokeWidth="1.6" fill="#dedede" />
          <polygon points="320,136 510,232 320,328 130,232" strokeWidth="1.5" fill="#d4d4d4" fillOpacity="0.7" />
          <polygon className="tm-svg-float-reverse" points="320,206 510,302 320,398 130,302" strokeWidth="1.6" />
          <line x1="130" y1="162" x2="130" y2="302" strokeWidth="1.4" />
          <line x1="510" y1="162" x2="510" y2="302" strokeWidth="1.4" />
          <line x1="320" y1="258" x2="320" y2="398" strokeWidth="1.4" />
          <line className="tm-svg-dash-slow" x1="320" y1="40" x2="320" y2="438" stroke={RED} strokeDasharray="5 4" strokeWidth="1.4" />
        </g>
      )}

      {variant === "parametric" && (
        <g stroke={CHARCOAL} fill="none">
          <g className="tm-svg-sway">
            {Array.from({ length: 12 }).map((_, i) => {
              const p = i * 42;
              return (
                <path
                  key={`c-${i}`}
                  d={`M ${60 + p * 0.6} 390 C ${150 + p * 0.4} ${90 + i * 10}, ${390 - p * 0.2} ${120 + i * 16}, ${560 - p * 0.3} 360`}
                  strokeWidth="1.15"
                  strokeOpacity={0.28 + (i % 3) * 0.16}
                />
              );
            })}
          </g>
          <path className="tm-svg-dash-slow" strokeDasharray="10 4" d="M 90 360 C 210 120, 420 120, 550 340" stroke={RED} strokeWidth="1.9" />
        </g>
      )}

      {variant === "ai" && (
        <g stroke={CHARCOAL} fill="none">
          <rect x="330" y="96" width="210" height="288" strokeWidth="1.5" fill="#e2e2e0" />
          <line x1="330" y1="168" x2="540" y2="168" strokeOpacity="0.45" />
          <line x1="330" y1="240" x2="540" y2="240" strokeOpacity="0.45" />
          <line x1="400" y1="96" x2="400" y2="384" strokeOpacity="0.45" />
          <line x1="470" y1="96" x2="470" y2="384" strokeOpacity="0.45" />
          {[140, 220, 300].map((y1, idx) => (
            <React.Fragment key={y1}>
              <circle className="tm-svg-pulse" cx="110" cy={y1} r="6.5" strokeWidth="1.5" fill="#fff" />
              <line x1="116" y1={y1} x2="220" y2={180 + (idx % 2) * 80} strokeOpacity="0.48" />
              <line
                className="tm-svg-dash-slow"
                strokeDasharray="6 4"
                x1="226"
                y1={180 + (idx % 2) * 80}
                x2="330"
                y2={168 + idx * 72}
                stroke={RED}
                strokeOpacity="0.72"
              />
            </React.Fragment>
          ))}
        </g>
      )}

      {variant === "atelier" && (
        <g stroke={CHARCOAL} fill="none">
          <rect x="84" y="88" width="472" height="304" strokeWidth="1.6" />
          <rect className="tm-svg-float-slow" x="116" y="120" width="128" height="272" strokeWidth="1.2" fill="#e0e0de" />
          <rect x="268" y="120" width="128" height="200" strokeWidth="1.2" />
          <rect className="tm-svg-float-reverse" x="420" y="120" width="104" height="272" strokeWidth="1.2" fill="#e0e0de" />
          <line className="tm-svg-dash-slow" x1="84" y1="392" x2="556" y2="88" stroke={CHARCOAL} strokeOpacity="0.3" strokeWidth="1.3" strokeDasharray="6 5" />
        </g>
      )}
    </svg>
  );
}

/* ── 5. Animated City Architectural Card SVGs (11 Unique Landmarks) ─────── */

export function TmCityPlateSvg({ city }: { city: string }) {
  const key = city.toLowerCase();
  return (
    <svg viewBox="0 0 180 180" className="w-full h-full block" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efefef" />
          <stop offset="100%" stopColor="#e2e2e0" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" fill={`url(#sky-${key})`} />
      <g stroke={CHARCOAL} strokeOpacity="0.14" strokeWidth="0.8">
        <line x1="0" y1="138" x2="180" y2="138" />
        <line className="tm-svg-dash-slow" x1="90" y1="0" x2="90" y2="180" strokeDasharray="3 4" />
      </g>
      <g className="tm-svg-float-slow" stroke={CHARCOAL} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {(key.includes("damghan") || key.includes("tehran")) && (
          <>
            <path d="M 26 138 V 98 Q 42 74 58 98 V 138" fill="#dfdfdd" />
            <path d="M 122 138 V 98 Q 138 74 154 98 V 138" fill="#dfdfdd" />
            <polygon points="74,138 78,62 90,42 102,62 106,138" fill="#d6d6d3" />
            <line x1="84" y1="74" x2="84" y2="138" strokeOpacity="0.4" />
            <line x1="96" y1="74" x2="96" y2="138" strokeOpacity="0.4" />
            <path className="tm-svg-pulse" d="M 78 62 L 90 42 L 102 62" stroke={RED} />
          </>
        )}
        {key.includes("isfahan") && (
          <>
            {[28, 62, 96, 130].map((x) => (
              <path key={x} d={`M ${x} 138 V 96 Q ${x + 12} 72 ${x + 24} 96 V 138`} fill="#dcdcd9" />
            ))}
            <line className="tm-svg-dash-slow" strokeDasharray="4 3" x1="20" y1="78" x2="162" y2="78" stroke={RED} />
          </>
        )}
        {key.includes("yazd") && (
          <>
            <rect x="44" y="48" width="32" height="90" fill="#dadad8" />
            <line x1="52" y1="48" x2="52" y2="92" />
            <line x1="60" y1="48" x2="60" y2="92" />
            <line x1="68" y1="48" x2="68" y2="92" />
            <path d="M 88 138 C 88 84, 146 84, 146 138" fill="#dfdfdd" />
            <circle className="tm-svg-pulse" cx="117" cy="64" r="4" stroke={RED} />
          </>
        )}
        {key.includes("shiraz") && (
          <>
            <rect x="28" y="88" width="124" height="50" fill="#dfdfdd" />
            <path d="M 22 88 L 90 50 L 158 88" />
            <path className="tm-svg-pulse" d="M 74 138 V 106 Q 90 90 106 106 V 138" stroke={RED} />
          </>
        )}
        {key.includes("tabriz") && (
          <>
            <rect x="38" y="54" width="104" height="84" fill="#dbdbd9" />
            <path d="M 68 138 V 86 A 22 24 0 0 1 112 86 V 138" fill="#e8e8e6" />
            <line className="tm-svg-pulse" x1="38" y1="68" x2="142" y2="68" stroke={RED} strokeOpacity="0.72" />
          </>
        )}
        {key.includes("rasht") && (
          <>
            <polygon points="90,52 24,94 156,94" fill="#d9d9d7" />
            <rect x="38" y="94" width="104" height="44" fill="#e3e3e1" />
            {[56, 80, 104, 124].map((x) => (
              <line key={x} x1={x} y1="94" x2={x} y2="138" />
            ))}
          </>
        )}
        {key.includes("mashhad") && (
          <>
            <path d="M 26 138 V 86 H 154 V 138" fill="#dfdfdd" />
            <path d="M 52 86 C 52 54, 128 54, 128 86" fill="#d4d4d2" />
            <path className="tm-svg-pulse" d="M 78 138 V 106 Q 90 92 102 106 V 138" stroke={RED} />
          </>
        )}
        {key.includes("ahvaz") && (
          <>
            <path d="M 18 118 H 162" />
            <path d="M 32 118 A 32 40 0 0 1 90 118" />
            <path className="tm-svg-pulse" d="M 90 118 A 32 40 0 0 1 148 118" stroke={RED} />
            <line x1="60" y1="78" x2="60" y2="138" />
            <line x1="120" y1="78" x2="120" y2="138" />
          </>
        )}
        {key.includes("kerman") && (
          <>
            <rect x="30" y="96" width="120" height="42" fill="#e0e0de" />
            <path d="M 48 96 A 20 20 0 0 1 88 96" fill="#d4d4d2" />
            <path d="M 92 96 A 20 20 0 0 1 132 96" fill="#d4d4d2" />
            <circle className="tm-svg-pulse" cx="90" cy="64" r="7" stroke={RED} />
          </>
        )}
        {key.includes("dubai") && (
          <>
            <rect x="48" y="48" width="28" height="90" fill="#dcdcd9" />
            <rect x="76" y="72" width="44" height="66" fill="#e4e4e2" />
            <line className="tm-svg-pulse" x1="90" y1="36" x2="128" y2="72" stroke={RED} />
          </>
        )}
        {key.includes("london") && (
          <>
            <rect x="44" y="64" width="20" height="74" fill="#d9d9d7" />
            <rect x="116" y="64" width="20" height="74" fill="#d9d9d7" />
            <line x1="20" y1="108" x2="160" y2="108" />
            <path className="tm-svg-pulse" d="M 64 70 Q 90 96 116 70" stroke={RED} />
          </>
        )}
      </g>
    </svg>
  );
}

/* ── 6. Interactive Stippled Halftone Dot-Matrix Map SVG (00:38..00:42) ──── */

const MAP_POINTS: [number, number, number][] = [
  // [x, y, hubOwner (-1 neutral, 0 Tehran HQ cluster, 1 Online West/North cluster, 2 Practice/Regional South-East)]
  [18, 14, 1], [22, 12, 1], [26, 13, 1], [21, 16, 1], [25, 17, 1],
  [30, 22, 1], [34, 20, 1], [38, 19, 1], [34, 24, 1], [38, 24, 1], [26, 26, 1], [30, 26, 1], [34, 27, 1], [38, 27, 1],
  [24, 31, 1], [28, 31, 1], [32, 31, 1], [36, 30, 1], [30, 35, 1], [34, 35, 1],

  [42, 22, 0], [46, 21, 0], [50, 22, 0], [42, 26, 0], [46, 25, 0], [50, 26, 0],
  [40, 30, 0], [44, 30, 0], [48, 30, 0], [52, 31, 0], [42, 34, 0], [46, 34, 0], [50, 34, 0], [44, 38, 0], [48, 38, 0], [52, 39, 0],

  [54, 32, 2], [58, 34, 2], [62, 36, 2], [66, 38, 2], [70, 40, 2],
  [54, 37, 2], [58, 38, 2], [62, 40, 2], [66, 42, 2], [70, 44, 2],
  [56, 42, 2], [60, 44, 2], [64, 46, 2], [68, 48, 2],
  [52, 47, 2], [56, 49, 2], [60, 52, 2], [54, 54, 2],

  [36, 14, -1], [40, 12, -1], [44, 11, -1], [48, 12, -1], [52, 13, -1], [56, 15, -1], [60, 18, -1], [64, 21, -1],
  [54, 19, -1], [58, 21, -1], [62, 24, -1], [66, 26, -1], [70, 32, -1], [74, 38, -1],
  [36, 46, -1], [40, 46, -1], [44, 46, -1], [48, 46, -1],
  [38, 50, -1], [42, 50, -1], [46, 50, -1], [50, 50, -1],
  [42, 54, -1], [46, 54, -1], [50, 54, -1], [44, 58, -1], [48, 58, -1], [52, 58, -1],
];

export type TmMapHubCard = {
  title: string;
  line: string;
  sub: string;
};

export function TmHalftoneMapSvg({
  activeHub,
  hoveredHub,
  onSelectHub,
  onHoverHub,
  hubData,
  dir = "ltr",
}: {
  activeHub: number | null;
  hoveredHub?: number | null;
  onSelectHub?: (idx: number) => void;
  onHoverHub?: (idx: number | null) => void;
  hubData?: TmMapHubCard[];
  dir?: "ltr" | "rtl";
}) {
  const focusHub = hoveredHub ?? activeHub;
  const hubs = [
    { x: 484, y: 198, cardX: 506, cardY: 118, label: "Damghan Venue" },
    { x: 332, y: 174, cardX: 112, cardY: 110, label: "Online Live" },
    { x: 562, y: 274, cardX: 586, cardY: 186, label: "Practice Hub" },
  ];

  return (
    <div className="tm-map__wrap" onMouseLeave={() => onHoverHub?.(null)}>
      <svg viewBox="0 0 920 440" className="tm-map__svg" aria-hidden="true">
        <defs>
          <radialGradient id="tm-map-fade" cx="50%" cy="50%" r="50%">
            <stop offset="35%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <mask id="tm-map-mask">
            <rect width="920" height="440" fill="url(#tm-map-fade)" />
          </mask>
        </defs>

        <g mask="url(#tm-map-mask)">
          {Array.from({ length: 24 }).map((_, row) =>
            Array.from({ length: 42 }).map((__, col) => {
              const cx = 60 + col * 19;
              const cy = 28 + row * 16;
              const dist = Math.hypot((cx - 460) / 340, (cy - 220) / 160);
              if (dist > 1.05 || (row + col) % 7 === 0) return null;
              return (
                <circle
                  key={`bg-${row}-${col}`}
                  cx={cx}
                  cy={cy}
                  r={dist < 0.7 ? 1.35 : 0.9}
                  fill="#d8d8d8"
                />
              );
            }),
          )}

          {/* Region halftone clusters lighting up Crimson when hovered/selected */}
          {MAP_POINTS.map(([px, py, owner], i) => {
            const lit = focusHub !== null && owner === focusHub;
            return (
              <g
                key={i}
                style={{ transition: "fill 0.35s ease, opacity 0.35s ease" }}
                fill={lit ? RED : "#cecece"}
                fillOpacity={lit ? 0.52 : 1}
              >
                <circle cx={px * 9.5} cy={py * 6.4} r={lit ? 2.5 : 2.1} />
                <circle cx={px * 9.5 + 8} cy={py * 6.4 + 4} r={lit ? 1.9 : 1.5} />
                <circle cx={px * 9.5 - 6} cy={py * 6.4 + 6} r={lit ? 1.7 : 1.4} />
              </g>
            );
          })}

          {/* Animated connecting studio flight paths */}
          <path
            className="tm-svg-dash-slow"
            d="M 332 174 Q 396 146 460 215 T 562 274"
            fill="none"
            stroke="rgba(43,43,43,0.2)"
            strokeWidth="1.1"
            strokeDasharray="4 4"
          />
        </g>

        {/* 3 Pulsing Interactive Hub Beacons */}
        {hubs.map((h, i) => {
          const isActive = focusHub === i;
          return (
            <g
              key={h.label}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => onHoverHub?.(i)}
              onClick={() => onSelectHub?.(i)}
            >
              {/* Invisible generous hit target for effortless hover matching video */}
              <circle cx={h.x} cy={h.y} r="34" fill="transparent" />
              <circle
                className="tm-svg-beacon-ring"
                style={{ transformOrigin: `${h.x}px ${h.y}px` }}
                cx={h.x}
                cy={h.y}
                r={isActive ? 26 : 16}
                fill={RED}
                fillOpacity={isActive ? 0.2 : 0.12}
              />
              <circle
                cx={h.x}
                cy={h.y}
                r={isActive ? 12 : 9}
                fill={RED}
                fillOpacity={0.32}
              />
              <circle cx={h.x} cy={h.y} r={isActive ? 5.5 : 4.5} fill={RED} />
            </g>
          );
        })}
      </svg>

      {/* Crisp Floating White Hub Tooltip Card matching video 00:39..00:41 */}
      {focusHub !== null && hubData?.[focusHub] && (
        <div
          className="tm-map__callout"
          dir={dir}
          style={{
            left: `${(hubs[focusHub].cardX / 920) * 100}%`,
            top: `${(hubs[focusHub].cardY / 440) * 100}%`,
          }}
        >
          <p className="tm-map__callout-title">{hubData[focusHub].title}</p>
          <p className="tm-map__callout-line">{hubData[focusHub].line}</p>
          <p className="tm-map__callout-sub" dir="ltr">
            {hubData[focusHub].sub}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── 7. Animated Milestone, Values, and Contact Architectural SVGs ──────── */

export function TmMilestoneSvg({ year }: { year: number }) {
  return (
    <svg viewBox="0 0 1100 580" preserveAspectRatio="xMidYMid slice" className="w-full h-full block" aria-hidden="true">
      <rect width="1100" height="580" fill="#ebebea" />
      <g stroke={GRID_LINE} strokeWidth="1">
        {[96, 192, 288, 384, 480].map((y) => (
          <line key={y} x1="0" y1={y} x2="1100" y2={y} />
        ))}
        {[180, 360, 540, 720, 900].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="580" />
        ))}
      </g>

      <g stroke={CHARCOAL} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* 1376 — ورود حرفه‌ای به BIM و Archicad: برش ایزومتریک + پلان دو‌بعدی پیوسته */}
        {year <= 1376 && (
          <g className="tm-svg-float-slow">
            <polygon points="550,82 810,192 550,302 290,192" fill="#e2e2df" strokeOpacity="0.82" />
            <polyline points="290,192 290,336 550,446 810,336 810,192" strokeOpacity="0.72" />
            <line x1="550" y1="302" x2="550" y2="446" strokeOpacity="0.72" />
            {/* Parametric BIM wall & aperture on axonometric face */}
            <polygon points="410,242 505,282 505,368 410,328" fill="#d7d7d4" strokeOpacity="0.85" />
            <polygon className="tm-svg-pulse" points="615,274 715,232 715,322 615,364" stroke={RED} strokeWidth="1.9" />
            {/* Smart object projection & dimension baseline */}
            <rect x="330" y="458" width="440" height="72" strokeDasharray="5 4" strokeOpacity="0.42" />
            <line className="tm-svg-dash-slow" x1="550" y1="54" x2="550" y2="536" stroke={RED} strokeDasharray="6 4" strokeOpacity="0.7" />
          </g>
        )}

        {/* 1378 — سردر دانشگاه پیام نور (طرح تیپ استانی): قوس شاخص ورودی + پایلون‌های متقارن */}
        {year === 1378 && (
          <g className="tm-svg-float-slow">
            {/* Datum ground & standardization grid */}
            <line x1="160" y1="452" x2="940" y2="452" strokeWidth="2.2" />
            <line className="tm-svg-dash-slow" x1="210" y1="92" x2="890" y2="92" stroke={RED} strokeDasharray="7 4" strokeOpacity="0.72" />
            {/* Twin masonry pylons */}
            <rect x="240" y="168" width="128" height="284" fill="#dfdedb" />
            <rect x="732" y="168" width="128" height="284" fill="#dfdedb" />
            {/* Modular fascia & cantilevered portal canopy */}
            <rect x="200" y="132" width="700" height="36" fill="#d5d4d0" />
            {[290, 420, 550, 680, 810].map((x) => (
              <line key={x} x1={x} y1="132" x2={x} y2="168" strokeOpacity="0.5" />
            ))}
            {/* Monumental central university arch */}
            <path d="M 368 452 V 270 Q 550 112 732 270 V 452" fill="#e9e9e6" strokeWidth="2.1" />
            <path className="tm-svg-pulse" d="M 414 452 V 290 Q 550 162 686 290 V 452" stroke={RED} strokeWidth="2" />
            {/* Center axis & steps */}
            <rect x="448" y="452" width="204" height="26" fill="#dadad7" />
            <line x1="550" y1="80" x2="550" y2="492" strokeOpacity="0.28" strokeDasharray="4 4" />
          </g>
        )}

        {/* 1389 — ساعت آفتابی قطبی - افقی: صفحه ساعت + عقربه قطبی + مسیر حرکت خورشید */}
        {year === 1389 && (
          <g>
            {/* Solar ecliptic arc */}
            <path className="tm-svg-dash-slow" d="M 190 360 A 360 250 0 0 1 910 360" strokeDasharray="6 5" strokeOpacity="0.45" />
            <circle className="tm-svg-pulse" cx="760" cy="148" r="22" fill="#ebebea" stroke={RED} strokeWidth="2" />
            <circle cx="760" cy="148" r="6" fill={RED} stroke="none" />
            {/* Sun ray vector casting shadow on dial */}
            <line className="tm-svg-dash-slow" x1="760" y1="148" x2="550" y2="338" stroke={RED} strokeWidth="1.6" strokeDasharray="5 4" />
            {/* Horizontal elliptical dial plate */}
            <ellipse cx="550" cy="378" rx="310" ry="118" fill="#e1e1de" />
            <ellipse cx="550" cy="378" rx="236" ry="86" strokeOpacity="0.45" />
            {/* Hour radial markings */}
            {[-2.2, -1.5, -0.8, 0, 0.8, 1.5, 2.2].map((k, idx) => (
              <line
                key={idx}
                x1="550"
                y1="378"
                x2={550 + k * 118}
                y2={378 - Math.cos(k * 0.45) * 98}
                strokeOpacity="0.52"
              />
            ))}
            {/* Polar-tilted Gnomon aligned to latitude */}
            <polygon className="tm-svg-float-slow" points="550,378 550,214 662,378" fill="#d4d4d0" strokeWidth="2" />
            <line x1="550" y1="214" x2="365" y2="395" stroke={RED} strokeWidth="2" strokeOpacity="0.82" />
          </g>
        )}

        {/* 1400 — طراحی پلازای شهری با Archicad: تراس‌های پلکانی + پرگولا و محور پیاده */}
        {year === 1400 && (
          <g className="tm-svg-float-slow">
            {/* Stepped urban plaza base geometry */}
            <polygon points="550,152 910,308 550,468 190,308" fill="#e1e1de" />
            <polygon points="550,192 820,308 550,424 280,308" fill="#d9d9d6" />
            <polygon points="550,236 720,308 550,382 380,308" fill="#ebebea" />
            {/* Archicad pergola truss canopy */}
            <polygon points="360,118 680,158 640,224 320,184" fill="#d6d6d2" fillOpacity="0.72" />
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1={352 + i * 74} y1={118 + i * 10} x2={312 + i * 74} y2={184 + i * 10} strokeOpacity="0.65" />
            ))}
            <line x1="340" y1="184" x2="340" y2="318" strokeWidth="2" />
            <line x1="640" y1="224" x2="640" y2="332" strokeWidth="2" />
            {/* Pedestrian plaza circulation path */}
            <path className="tm-svg-dash-slow" d="M 210 388 Q 490 322 895 276" stroke={RED} strokeWidth="2.1" strokeDasharray="8 5" />
            <circle className="tm-svg-pulse" cx="550" cy="308" r="10" fill={RED} stroke="none" />
          </g>
        )}

        {/* 1401 — طراحی الگوریتم پارامتریک آجری: ماتریس آجرهای چرخان + منحنی جاذب سینوسی */}
        {year === 1401 && (
          <g>
            <rect x="210" y="96" width="680" height="388" fill="#e5e5e2" strokeOpacity="0.42" />
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 12 }).map((__, col) => {
                const stagger = row % 2 === 0 ? 0 : 24;
                const bx = 248 + col * 50 + stagger;
                const by = 132 + row * 44;
                const wave = Math.sin(col * 0.52 + row * 0.38);
                const rot = Math.round(wave * 28);
                const isAttractor = Math.abs(wave) > 0.84;
                return (
                  <rect
                    key={`${row}-${col}`}
                    x={bx - 16}
                    y={by - 9}
                    width="32"
                    height="18"
                    transform={`rotate(${rot} ${bx} ${by})`}
                    fill={isAttractor ? "#d5d5d1" : "#f0f0ed"}
                    stroke={isAttractor ? RED : CHARCOAL}
                    strokeOpacity={isAttractor ? 0.92 : 0.62}
                  />
                );
              }),
            )}
            <path
              className="tm-svg-dash-slow"
              d="M 210 296 Q 380 156 550 296 T 890 296"
              stroke={RED}
              strokeWidth="2.2"
              strokeDasharray="7 4"
            />
          </g>
        )}

        {/* 1402 — تلفیق GFRC در طراحی BIM: پانل‌های نما، زیرسازی خشک و درزهای مدولار */}
        {year === 1402 && (
          <g className="tm-svg-float-slow">
            {/* Structural BIM subframe ribs */}
            <rect x="220" y="96" width="660" height="384" fill="#e3e3e0" />
            {[330, 440, 550, 660, 770].map((x) => (
              <line key={x} x1={x} y1="96" x2={x} y2="480" strokeOpacity="0.35" strokeDasharray="4 4" />
            ))}
            {/* Ribbed curved GFRC cladding cassettes */}
            {[0, 1, 2, 3].map((c) => {
              const px = 248 + c * 156;
              return (
                <g key={c}>
                  <path
                    d={`M ${px} 126 C ${px + 42} 148, ${px + 94} 148, ${px + 136} 126 V 450 C ${px + 94} 428, ${px + 42} 428, ${px} 450 Z`}
                    fill="#dededa"
                  />
                  <line x1={px + 68} y1="142" x2={px + 68} y2="434" strokeOpacity="0.55" />
                  <circle cx={px + 18} cy="158" r="3" fill={CHARCOAL} stroke="none" />
                  <circle cx={px + 118} cy="158" r="3" fill={CHARCOAL} stroke="none" />
                  <circle cx={px + 18} cy="418" r="3" fill={CHARCOAL} stroke="none" />
                  <circle cx={px + 118} cy="418" r="3" fill={CHARCOAL} stroke="none" />
                </g>
              );
            })}
            {/* Precision expansion joint & BIM tag */}
            <line className="tm-svg-pulse" x1="552" y1="96" x2="552" y2="480" stroke={RED} strokeWidth="2.2" />
            <circle className="tm-svg-beacon-ring" style={{ transformOrigin: "552px 288px" }} cx="552" cy="288" r="18" stroke={RED} />
          </g>
        )}

        {/* 1403 — مدل‌سازی BIM آثار تاریخی دامغان و کارگاه‌ها: پلان ستاره‌ای برج + وایرفریم */}
        {year === 1403 && (
          <g>
            {/* Star-flanged polygon plan (Damghan Mehmandust brick tower reference) */}
            <polygon
              className="tm-svg-spin-slow"
              style={{ transformOrigin: "375px 290px" }}
              points="375,134 415,212 498,185 456,262 526,315 442,340 448,426 375,374 302,426 308,340 224,315 294,262 252,185 335,212"
              fill="#dfdeda"
            />
            <circle cx="375" cy="290" r="54" strokeDasharray="4 4" strokeOpacity="0.6" />
            {/* Connected 3D BIM wire ribs elevation on the right */}
            <g className="tm-svg-float-slow">
              <polygon points="730,112 850,216 850,432 610,432 610,216" fill="#e2e2df" />
              {[645, 688, 730, 772, 815].map((x) => (
                <line key={x} x1={x} y1="216" x2={x} y2="432" strokeOpacity="0.6" />
              ))}
              <line className="tm-svg-pulse" x1="610" y1="216" x2="850" y2="216" stroke={RED} strokeWidth="2" />
            </g>
            <line className="tm-svg-dash-slow" x1="456" y1="262" x2="610" y2="262" stroke={RED} strokeDasharray="6 4" />
          </g>
        )}

        {/* 1404 — گردش‌کارهای هوش مصنوعی و طراحی محاسباتی: گراف عصبی ← توده معماری */}
        {year === 1404 && (
          <g>
            {[160, 290, 420].map((y, idx) => (
              <React.Fragment key={y}>
                <circle className="tm-svg-pulse" cx="250" cy={y} r="10" fill="#fff" strokeWidth="1.8" />
                <line x1="260" y1={y} x2="430" y2={220 + (idx % 2) * 140} strokeOpacity="0.55" />
                <line className="tm-svg-dash-slow" x1="444" y1={220 + (idx % 2) * 140} x2="610" y2={190 + idx * 96} stroke={RED} strokeDasharray="6 4" />
              </React.Fragment>
            ))}
            <circle cx="436" cy="220" r="8" fill={RED} stroke="none" />
            <circle cx="436" cy="360" r="8" fill={CHARCOAL} stroke="none" />
            <g className="tm-svg-float-slow">
              <rect x="610" y="128" width="260" height="324" fill="#dfdeda" />
              <line x1="610" y1="236" x2="870" y2="236" strokeOpacity="0.5" />
              <line x1="610" y1="344" x2="870" y2="344" strokeOpacity="0.5" />
              <line x1="740" y1="128" x2="740" y2="452" strokeOpacity="0.5" />
            </g>
          </g>
        )}

        {/* 1405 — اکوسیستم جامع CAD · BIM · Parametric · AI در نیله */}
        {year >= 1405 && (
          <g>
            {[260, 453, 646, 840].map((cx, i) => (
              <g key={cx}>
                <circle
                  className={i === 3 ? "tm-svg-beacon-ring" : "tm-svg-float-slow"}
                  style={i === 3 ? { transformOrigin: `${cx}px 290px` } : undefined}
                  cx={cx}
                  cy="290"
                  r={58 + i * 4}
                  fill={i % 2 === 0 ? "#e2e2df" : "#dadad7"}
                  stroke={i === 3 ? RED : CHARCOAL}
                  strokeWidth={i === 3 ? "2.1" : "1.5"}
                />
                {i < 3 && (
                  <line className="tm-svg-dash-slow" x1={cx + 62} y1="290" x2={cx + 128} y2="290" stroke={RED} strokeDasharray="5 4" strokeWidth="1.8" />
                )}
              </g>
            ))}
            <circle cx="840" cy="290" r="10" fill={RED} stroke="none" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function TmValueSvg({ valueKey, dark = false }: { valueKey: string; dark?: boolean }) {
  const strokeMain = dark ? "rgba(255,255,255,0.42)" : CHARCOAL;
  const strokeGrid = dark ? "rgba(255,255,255,0.08)" : GRID_LINE;
  const bg = dark ? "#232323" : "#ebebea";
  return (
    <svg viewBox="0 0 1200 780" preserveAspectRatio="xMidYMid slice" className="w-full h-full block" aria-hidden="true">
      <rect width="1200" height="780" fill={bg} />
      <g stroke={strokeGrid} strokeWidth="1">
        {[130, 260, 390, 520, 650].map((y) => (
          <line key={`hy-${y}`} x1="0" y1={y} x2="1200" y2={y} />
        ))}
        {[200, 400, 600, 800, 1000].map((x) => (
          <line key={`vx-${x}`} x1={x} y1="0" x2={x} y2="780" />
        ))}
      </g>

      <g className="tm-svg-float-slow" stroke={strokeMain} fill="none" strokeWidth="1.5">
        {valueKey === "exactness" && (
          <>
            <rect x="280" y="120" width="640" height="540" />
            <circle cx="600" cy="390" r="190" strokeDasharray="6 6" className="tm-svg-spin-slow" style={{ transformOrigin: "600px 390px" }} />
            <line x1="200" y1="390" x2="1000" y2="390" stroke={RED} strokeOpacity="0.65" />
            <line x1="600" y1="60" x2="600" y2="720" strokeOpacity="0.35" />
          </>
        )}
        {valueKey === "method" && (
          <>
            <polygon points="600,110 920,280 600,450 280,280" />
            <polygon className="tm-svg-float-reverse" points="600,220 920,390 600,560 280,390" />
            <polygon points="600,330 920,500 600,670 280,500" />
            <line className="tm-svg-dash-slow" x1="600" y1="90" x2="600" y2="700" stroke={RED} strokeDasharray="6 4" />
          </>
        )}
        {valueKey === "craft" && (
          <>
            {Array.from({ length: 14 }).map((_, i) => (
              <line key={i} x1={260 + i * 48} y1="140" x2={260 + i * 48} y2="640" strokeOpacity={0.2 + (i % 3) * 0.16} />
            ))}
            <path className="tm-svg-sway" d="M 240 480 Q 600 180 960 480" stroke={RED} strokeWidth="2.2" />
          </>
        )}
        {valueKey === "future" && (
          <>
            {Array.from({ length: 16 }).map((_, i) => (
              <path
                key={i}
                className={i % 2 === 0 ? "tm-svg-float-slow" : "tm-svg-float-reverse"}
                d={`M ${160 + i * 36} 660 C ${320 + i * 16} 180, ${740 - i * 12} 220, ${1020 - i * 24} 620`}
                strokeOpacity={0.22 + (i % 4) * 0.12}
              />
            ))}
            <circle className="tm-svg-beacon-ring" style={{ transformOrigin: "600px 330px" }} cx="600" cy="330" r="40" stroke={RED} />
          </>
        )}
        {valueKey === "growth" && (
          <>
            {Array.from({ length: 7 }).map((_, i) => (
              <circle key={i} cx="600" cy="390" r={60 + i * 46} strokeOpacity={0.18 + (i % 2) * 0.2} />
            ))}
            <circle className="tm-svg-pulse" cx="600" cy="390" r="14" fill={RED} stroke="none" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Diagonal Architectural Atrium SVG for Contact Page (matches 02:27) */
export function TmContactStudioSvg() {
  return (
    <svg viewBox="0 0 800 580" preserveAspectRatio="xMidYMid slice" className="w-full h-full block" aria-hidden="true">
      <rect width="800" height="580" fill="#ebebea" />
      <g stroke={GRID_LINE} strokeWidth="1">
        {[96, 192, 288, 384, 480].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} />
        ))}
        {[160, 320, 480, 640].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="580" />
        ))}
      </g>
      <g className="tm-svg-float-slow" stroke={CHARCOAL} fill="none" strokeWidth="1.6">
        <rect x="140" y="90" width="520" height="400" fill="#e2e2e0" fillOpacity="0.55" />
        <line x1="140" y1="240" x2="660" y2="240" strokeOpacity="0.45" />
        <line x1="340" y1="90" x2="340" y2="490" strokeOpacity="0.45" />
        <line x1="510" y1="90" x2="510" y2="490" strokeOpacity="0.45" />
        <polygon points="340,240 510,240 660,120 660,490 340,490" fill="#dadad8" fillOpacity="0.48" />
        <path className="tm-svg-dash-slow" strokeDasharray="6 4" d="M 140 490 L 510 240 L 660 240" stroke={RED} strokeWidth="1.8" />
        <circle className="tm-svg-beacon-ring" style={{ transformOrigin: "510px 240px" }} cx="510" cy="240" r="16" stroke={RED} />
        <circle cx="510" cy="240" r="4" fill={RED} stroke="none" />
      </g>
    </svg>
  );
}

/* ── 8. Animated Monochrome Studio Portrait SVGs for Team Strip (11-y8850) ─ */

export function TmInstructorPortraitSvg({
  name,
  index,
}: {
  name: string;
  index: number;
}) {
  const pose = index % 5;
  return (
    <svg viewBox="0 0 340 460" preserveAspectRatio="xMidYMid slice" className="w-full h-full block" aria-hidden="true">
      <defs>
        <linearGradient id={`p-bg-${index}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efefef" />
          <stop offset="100%" stopColor="#e6e6e6" />
        </linearGradient>
        <linearGradient id={`p-suit-${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={pose % 2 === 0 ? "#383838" : "#2f2f2f"} />
          <stop offset="55%" stopColor="#242424" />
          <stop offset="100%" stopColor="#191919" />
        </linearGradient>
      </defs>

      <rect width="340" height="460" fill={`url(#p-bg-${index})`} />

      {/* Subtle rotating architectural elevation compass behind subject */}
      <g stroke="#2b2b2b" strokeOpacity="0.08" strokeWidth="1">
        <line x1="170" y1="0" x2="170" y2="460" strokeDasharray="3 6" />
        <circle
          className="tm-svg-spin-slow"
          style={{ transformOrigin: "170px 186px" }}
          cx="170"
          cy="186"
          r={104 + pose * 4}
          fill="none"
          strokeDasharray="16 12"
        />
      </g>

      <g className="tm-svg-float-slow">
        <rect x="148" y="218" width="44" height="46" rx="8" fill="#c9c9c9" />
        <ellipse cx="170" cy="168" rx="45" ry="56" fill="#d8d8d8" stroke="#2b2b2b" strokeOpacity="0.22" strokeWidth="1.2" />

        {pose === 0 && (
          <path d="M 125 162 C 122 108, 218 104, 215 162 C 202 128, 138 128, 125 162 Z" fill="#2b2b2b" />
        )}
        {pose === 1 && (
          <path d="M 122 172 C 118 105, 222 105, 218 172 C 216 218, 228 248, 222 268 L 198 246 C 198 195, 196 138, 170 132 C 144 138, 142 195, 142 246 L 118 268 C 112 248, 124 218, 122 172 Z" fill="#262626" />
        )}
        {pose === 2 && (
          <>
            <path d="M 124 156 C 128 106, 212 100, 216 154 C 200 130, 158 120, 124 156 Z" fill="#323232" />
            <rect x="136" y="160" width="28" height="16" rx="4" fill="none" stroke="#2b2b2b" strokeWidth="2" />
            <rect x="176" y="160" width="28" height="16" rx="4" fill="none" stroke="#2b2b2b" strokeWidth="2" />
            <line x1="164" y1="168" x2="176" y2="168" stroke="#2b2b2b" strokeWidth="2" />
          </>
        )}
        {pose === 3 && (
          <path d="M 120 170 C 115 104, 225 104, 220 170 C 218 205, 215 232, 206 254 L 194 244 C 198 198, 194 142, 170 136 C 146 142, 142 198, 146 244 L 134 254 C 125 232, 122 205, 120 170 Z" fill="#2e2e2e" />
        )}
        {pose === 4 && (
          <>
            <path d="M 125 162 C 126 112, 214 108, 215 162 C 198 134, 142 134, 125 162 Z" fill="#242424" />
            <path d="M 140 198 C 148 224, 192 224, 200 198 C 192 214, 148 214, 140 198 Z" fill="#2b2b2b" opacity="0.45" />
          </>
        )}

        {pose === 2 || pose === 4 ? (
          <rect x="144" y="242" width="52" height="34" rx="4" fill="#242424" />
        ) : (
          <polygon points="140,250 170,318 200,250 170,264" fill="#fafafa" />
        )}

        <path
          d="M 44 460 C 52 342, 86 276, 140 256 L 170 326 L 200 256 C 254 276, 288 342, 296 460 Z"
          fill={`url(#p-suit-${index})`}
        />
        <polyline points="140,256 158,334 170,326" fill="none" stroke="#4a4a4a" strokeWidth="1.6" />
        <polyline points="200,256 182,334 170,326" fill="none" stroke="#4a4a4a" strokeWidth="1.6" />
        <path
          d="M 88 410 C 138 388, 210 392, 252 418"
          fill="none"
          stroke="#555555"
          strokeWidth="1.5"
          strokeOpacity="0.65"
        />
      </g>
      <title>{name}</title>
    </svg>
  );
}
