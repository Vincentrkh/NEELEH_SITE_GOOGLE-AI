"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getCourseArtworkKey, type CourseArtworkKey } from "@/lib/domain/academy-rules";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

export type PointerOffset = { x: number; y: number };

type CourseSoftwareArtworkProps = {
  /** DB slug, 01..09 index, or title */
  slugOrKey: string;
  /** Optional external pointer in normalized [-1..1] range (e.g. from row hover stage) */
  externalPointer?: PointerOffset;
  /** Compact variant hides subtle HUD coordinate lines for small cards/badges */
  compact?: boolean;
  className?: string;
};

const SOFTWARE_LABELS: Record<CourseArtworkKey, string> = {
  autocad: "AutoCAD / GstarCAD",
  sketchup: "SketchUp",
  revit: "Revit BIM",
  rhino: "Rhino NURBS",
  render: "Enscape / Lumion / V-Ray",
  excel: "Excel BOQ",
  grasshopper: "Grasshopper",
  automation: "Dynamo / Python",
  "ai-bim": "AI + Rhino + Revit",
};

export function CourseSoftwareArtwork({
  slugOrKey,
  externalPointer,
  compact = false,
  className = "",
}: CourseSoftwareArtworkProps) {
  const artworkKey = getCourseArtworkKey(slugOrKey);
  const reduced = useSafeReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  React.useEffect(() => {
    if (!externalPointer) return;
    rawX.set(Math.max(-1, Math.min(1, externalPointer.x)));
    rawY.set(Math.max(-1, Math.min(1, externalPointer.y)));
  }, [externalPointer, rawX, rawY]);

  const springConfig = { stiffness: 150, damping: 20, mass: 0.6 };
  const px = useSpring(rawX, springConfig);
  const py = useSpring(rawY, springConfig);

  const shiftX = useTransform(px, [-1, 1], [-14, 14]);
  const shiftY = useTransform(py, [-1, 1], [-12, 12]);
  const slowX = useTransform(px, [-1, 1], [-7, 7]);
  const slowY = useTransform(py, [-1, 1], [-6, 6]);
  const rotDeg = useTransform(px, [-1, 1], [-9, 9]);
  const bladeRot = useTransform(px, [-1, 1], [-22, 22]);
  const tiltDeg = useTransform(py, [-1, 1], [6, -6]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
    rawX.set(Math.max(-1, Math.min(1, nx)));
    rawY.set(Math.max(-1, Math.min(1, ny)));
  }

  function handleMouseLeave() {
    if (externalPointer) return;
    rawX.set(0);
    rawY.set(0);
  }

  const primaryStroke = "currentColor";
  const accentStroke = "#D92B2B";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={SOFTWARE_LABELS[artworkKey]}
      className={`relative select-none overflow-hidden text-foreground ${className}`}
    >
      <motion.svg
        viewBox="0 0 320 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
        animate={reduced ? undefined : { y: [0, -2.5, 0] }}
        transition={reduced ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Subtle drafting backdrop grid */}
        {!compact && (
          <g stroke={primaryStroke} strokeOpacity="0.08" strokeWidth="0.75">
            <line x1="24" y1="36" x2="296" y2="36" />
            <line x1="24" y1="184" x2="296" y2="184" />
            <line x1="40" y1="20" x2="40" y2="200" />
            <line x1="280" y1="20" x2="280" y2="200" />
            <circle cx="40" cy="36" r="2.2" />
            <circle cx="280" cy="36" r="2.2" />
            <circle cx="40" cy="184" r="2.2" />
            <circle cx="280" cy="184" r="2.2" />
          </g>
        )}

        {/* 1. AutoCAD A + GstarCAD G */}
        {artworkKey === "autocad" && (
          <g>
            {/* Dynamic CAD crosshair following mouse */}
            <motion.g
              style={reduced ? undefined : { x: shiftX, y: shiftY }}
              stroke={accentStroke}
              strokeWidth="0.9"
              strokeOpacity="0.45"
              strokeDasharray="3 3"
            >
              <line x1="160" y1="26" x2="160" y2="194" />
              <line x1="48" y1="110" x2="272" y2="110" />
              <rect x="151" y="101" width="18" height="18" strokeDasharray="none" />
            </motion.g>

            {/* AutoCAD Ribbon "A" Wireframe */}
            <motion.g
              style={reduced ? undefined : { x: slowX, y: slowY }}
              stroke={primaryStroke}
              strokeWidth="1.65"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <motion.path
                d="M 118 164 L 146 54 L 166 54 L 194 164 L 173 164 L 166 135 L 142 135 L 136 164 Z"
                initial={reduced ? undefined : { pathLength: 0.15, opacity: 0.7 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
              <path d="M 146 116 L 162 116 L 154 78 Z" stroke={accentStroke} strokeWidth="1.4" />
              <path d="M 146 54 L 136 68 L 110 164" strokeOpacity="0.45" strokeWidth="1.1" />
            </motion.g>

            {/* GstarCAD Geometric "G" Mark */}
            <motion.g
              style={reduced ? undefined : { x: shiftX, y: shiftY }}
              stroke={primaryStroke}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M 244 84 A 28 28 0 1 0 246 132 L 246 112 L 226 112" />
              <circle cx="222" cy="112" r="3" fill={accentStroke} stroke="none" />
            </motion.g>

            {!compact && (
              <g stroke={primaryStroke} strokeOpacity="0.45" strokeWidth="0.9">
                <line x1="110" y1="178" x2="246" y2="178" />
                <line x1="110" y1="173" x2="110" y2="183" />
                <line x1="246" y1="173" x2="246" y2="183" />
                <text x="166" y="192" fill="currentColor" stroke="none" fontSize="8" fontFamily="monospace" opacity="0.55">
                  CAD · DWG · PHASE-2
                </text>
              </g>
            )}
          </g>
        )}

        {/* 2. SketchUp Stepped Isometric Wireframe Cubes */}
        {artworkKey === "sketchup" && (
          <g>
            {/* Three-axis coordinate triad */}
            <g strokeWidth="1.1" strokeOpacity="0.6">
              <line x1="160" y1="120" x2="248" y2="168" stroke={accentStroke} />
              <line x1="160" y1="120" x2="72" y2="168" stroke="#15803d" />
              <line x1="160" y1="120" x2="160" y2="30" stroke="#1d4ed8" />
            </g>

            {/* Outer stepped SketchUp isometric cube silhouette */}
            <motion.g
              style={reduced ? undefined : { rotate: rotDeg, x: slowX, y: slowY, transformOrigin: "160px 115px" }}
              stroke={primaryStroke}
              strokeWidth="1.65"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {/* Main cube outer hexagon */}
              <polygon points="160,44 224,81 224,149 160,186 96,149 96,81" />
              {/* Inner stepped notch signature of SketchUp logo */}
              <polyline points="96,81 160,118 224,81" />
              <line x1="160" y1="118" x2="160" y2="186" />
              {/* Stepped middle tier */}
              <polygon
                points="160,64 202,88 160,112 118,88"
                stroke={accentStroke}
                strokeWidth="1.5"
              />
              <polyline
                points="118,88 118,128 160,152 202,128 202,88"
                stroke={accentStroke}
                strokeWidth="1.35"
                strokeOpacity="0.85"
              />
              {/* Inner top step */}
              <polygon points="160,80 180,91 160,102 140,91" stroke={primaryStroke} strokeWidth="1.2" />
            </motion.g>

            {!compact && (
              <text x="115" y="198" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                PUSH / PULL · COMPONENT
              </text>
            )}
          </g>
        )}

        {/* 3. Revit Architectural "R" + BIM Level Datum Lines */}
        {artworkKey === "revit" && (
          <g>
            {/* BIM Datum Levels */}
            <motion.g
              style={reduced ? undefined : { x: slowX }}
              stroke={primaryStroke}
              strokeOpacity="0.35"
              strokeWidth="0.95"
              strokeDasharray="4 3"
            >
              <line x1="56" y1="62" x2="264" y2="62" />
              <line x1="56" y1="112" x2="264" y2="112" />
              <line x1="56" y1="162" x2="264" y2="162" />
              <circle cx="264" cy="62" r="5" strokeDasharray="none" stroke={accentStroke} />
              <circle cx="264" cy="112" r="5" strokeDasharray="none" />
              <circle cx="264" cy="162" r="5" strokeDasharray="none" />
            </motion.g>

            {/* Iconic Architectural Revit "R" Polygon */}
            <motion.g
              style={reduced ? undefined : { x: shiftX, y: shiftY }}
              stroke={primaryStroke}
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <path d="M 106 164 L 106 54 L 164 54 C 186 54 198 66 198 86 C 198 104 186 116 165 118 L 204 164 L 178 164 L 143 120 L 126 120 L 126 164 Z" />
              <path d="M 126 72 L 160 72 C 171 72 177 78 177 87 C 177 97 171 103 160 103 L 126 103 Z" stroke={accentStroke} />
              {/* Extruded 3D depth edge */}
              <polyline points="106,54 118,44 174,44 195,58" strokeOpacity="0.45" strokeWidth="1.1" />
            </motion.g>

            {!compact && (
              <text x="64" y="190" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                BIM · LEVELS · SCHEDULES
              </text>
            )}
          </g>
        )}

        {/* 4. Rhino Silhouette + NURBS Control Points */}
        {artworkKey === "rhino" && (
          <g>
            {/* Dynamic NURBS Curve Hull reacting to cursor */}
            <motion.g style={reduced ? undefined : { x: shiftX, y: shiftY }}>
              <path
                d="M 52 152 L 106 60 L 194 46 L 266 128"
                stroke={accentStroke}
                strokeWidth="0.9"
                strokeDasharray="3 3"
                strokeOpacity="0.65"
              />
              <path
                d="M 52 152 C 98 62, 198 50, 266 128"
                stroke={accentStroke}
                strokeWidth="1.5"
              />
              <circle cx="106" cy="60" r="3" fill={accentStroke} />
              <circle cx="194" cy="46" r="3" fill={accentStroke} />
            </motion.g>

            {/* Iconic Rhino geometric faceted head & horn wireframe */}
            <motion.g
              style={reduced ? undefined : { x: slowX, y: slowY }}
              stroke={primaryStroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {/* Main Rhino profile silhouette */}
              <path d="M 76 162 L 94 114 L 126 88 L 178 88 L 210 102 L 246 82 L 236 116 L 254 128 L 234 148 L 192 154 L 166 164 Z" />
              {/* Internal NURBS facets */}
              <polyline points="126,88 148,128 192,154" strokeWidth="1.1" strokeOpacity="0.6" />
              <polyline points="178,88 186,124 234,148" strokeWidth="1.1" strokeOpacity="0.6" />
              <line x1="148" y1="128" x2="186" y2="124" strokeWidth="1.1" strokeOpacity="0.6" />
              {/* Horn highlight */}
              <polygon points="210,102 246,82 236,116" stroke={accentStroke} strokeWidth="1.5" />
            </motion.g>

            {!compact && (
              <text x="108" y="192" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                NURBS · CURVE · SHELL
              </text>
            )}
          </g>
        )}

        {/* 5. V-Ray / Enscape / Lumion Optical Aperture + Light Rays */}
        {artworkKey === "render" && (
          <g>
            {/* Rotating Aperture Blades */}
            <motion.g
              style={reduced ? undefined : { rotate: bladeRot, transformOrigin: "160px 108px" }}
              stroke={primaryStroke}
              strokeWidth="1.45"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="160" cy="108" r="56" />
              <circle cx="160" cy="108" r="46" strokeOpacity="0.35" strokeDasharray="3 3" />
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <g key={deg} transform={`rotate(${deg} 160 108)`}>
                  <line x1="160" y1="62" x2="186" y2="108" />
                </g>
              ))}
              <polygon
                points="160,84 181,96 181,120 160,132 139,120 139,96"
                stroke={accentStroke}
                strokeWidth="1.6"
              />
            </motion.g>

            {/* Virtual Sun & Photometric Light Rays */}
            <motion.g
              style={reduced ? undefined : { x: shiftX, y: shiftY }}
              stroke={accentStroke}
              strokeWidth="1.2"
              strokeLinecap="round"
            >
              <circle cx="242" cy="54" r="7" />
              <line x1="231" y1="64" x2="196" y2="88" strokeDasharray="2.5 2.5" />
              <line x1="226" y1="54" x2="202" y2="66" strokeDasharray="2.5 2.5" />
            </motion.g>

            {!compact && (
              <text x="95" y="192" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                RAYTRACE · PBR · SUNLIGHT
              </text>
            )}
          </g>
        )}

        {/* 6. Excel "X" + Smart BOQ Grid */}
        {artworkKey === "excel" && (
          <g>
            {/* Spreadsheet Grid */}
            <g stroke={primaryStroke} strokeOpacity="0.28" strokeWidth="1">
              <rect x="86" y="54" width="176" height="112" rx="4" />
              <line x1="142" y1="54" x2="142" y2="166" />
              <line x1="202" y1="54" x2="202" y2="166" />
              <line x1="86" y1="82" x2="262" y2="82" />
              <line x1="86" y1="110" x2="262" y2="110" />
              <line x1="86" y1="138" x2="262" y2="138" />
            </g>

            {/* Active Cell Tracking Cursor */}
            <motion.rect
              x="142"
              y="82"
              width="60"
              height="28"
              stroke={accentStroke}
              strokeWidth="1.5"
              fill={accentStroke}
              fillOpacity="0.08"
              style={reduced ? undefined : { x: shiftX, y: slowY }}
            />

            {/* Iconic Excel "X" Front Badge Tile */}
            <motion.g
              style={reduced ? undefined : { x: slowX, y: slowY }}
            >
              <rect
                x="56"
                y="76"
                width="64"
                height="68"
                rx="6"
                fill="var(--background)"
                stroke={primaryStroke}
                strokeWidth="1.75"
              />
              <path
                d="M 74 94 L 102 126 M 102 94 L 74 126"
                stroke={accentStroke}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </motion.g>

            {!compact && (
              <text x="128" y="192" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                =SUM(BOQ) · TAKEOFF
              </text>
            )}
          </g>
        )}

        {/* 7. Grasshopper Parametric Battery Nodes + Elastic Bezier Wires */}
        {artworkKey === "grasshopper" && (
          <g>
            {/* Dynamic Bezier wires bending smoothly on pointer */}
            <motion.g
              style={reduced ? undefined : { x: slowX, y: slowY }}
              stroke={accentStroke}
              strokeWidth="1.65"
              strokeLinecap="round"
            >
              <path d="M 108 76 C 142 76, 134 110, 166 110" />
              <path d="M 108 144 C 142 144, 134 114, 166 114" />
              <path d="M 224 112 C 246 112, 248 92, 268 92" />
            </motion.g>

            {/* Battery Node Capsules (authentic Grasshopper component shape) */}
            <motion.g
              style={reduced ? undefined : { x: shiftX, y: shiftY }}
              stroke={primaryStroke}
              strokeWidth="1.5"
            >
              {/* Input Param 1 */}
              <rect x="50" y="60" width="58" height="32" rx="6" fill="var(--background)" />
              <circle cx="108" cy="76" r="3" fill={accentStroke} stroke="none" />
              <line x1="60" y1="76" x2="96" y2="76" strokeOpacity="0.45" />

              {/* Input Param 2 */}
              <rect x="50" y="128" width="58" height="32" rx="6" fill="var(--background)" />
              <circle cx="108" cy="144" r="3" fill={accentStroke} stroke="none" />
              <line x1="60" y1="144" x2="96" y2="144" strokeOpacity="0.45" />

              {/* Main Facade Generator Battery */}
              <rect x="166" y="88" width="58" height="48" rx="7" fill="var(--background)" strokeWidth="1.8" />
              <circle cx="166" cy="110" r="3" fill={primaryStroke} />
              <circle cx="166" cy="114" r="3" fill={primaryStroke} />
              <circle cx="224" cy="112" r="3" fill={accentStroke} stroke="none" />
              <path d="M 180 120 Q 195 96 210 120" stroke={accentStroke} strokeWidth="1.4" />

              {/* Parametric Facade Preview */}
              <rect x="246" y="54" width="44" height="76" rx="3" strokeOpacity="0.6" />
              <line x1="257" y1="54" x2="257" y2="130" strokeOpacity="0.3" />
              <line x1="268" y1="54" x2="268" y2="130" strokeOpacity="0.3" />
              <line x1="279" y1="54" x2="279" y2="130" strokeOpacity="0.3" />
            </motion.g>

            {!compact && (
              <text x="92" y="192" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                DATA TREES · FACADE GENERATOR
              </text>
            )}
          </g>
        )}

        {/* 8. Office Automation / Python / Dynamo Gear & Script Nodes */}
        {artworkKey === "automation" && (
          <g>
            {/* Outer Precision Gear rotating with pointer */}
            <motion.g
              style={reduced ? undefined : { rotate: bladeRot, transformOrigin: "126px 110px" }}
              stroke={primaryStroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
            >
              <circle cx="126" cy="110" r="34" />
              <circle cx="126" cy="110" r="14" stroke={accentStroke} />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <rect
                  key={a}
                  x="121"
                  y="66"
                  width="10"
                  height="10"
                  rx="1.5"
                  transform={`rotate(${a} 126 110)`}
                  fill="var(--background)"
                />
              ))}
            </motion.g>

            {/* Python / Dynamo Interlocking Automation Pipeline */}
            <motion.g
              style={reduced ? undefined : { x: shiftX, y: slowY }}
              stroke={primaryStroke}
              strokeWidth="1.45"
            >
              <path d="M 164 110 L 204 76 L 260 76" stroke={accentStroke} strokeDasharray="3 3" />
              <path d="M 164 110 L 204 144 L 260 144" strokeOpacity="0.55" />
              <rect x="204" y="60" width="60" height="32" rx="6" fill="var(--background)" />
              <path d="M 218 72 L 226 76 L 218 80 M 232 80 L 246 80" stroke={accentStroke} strokeLinecap="round" />
              <rect x="204" y="128" width="60" height="32" rx="6" fill="var(--background)" />
              <line x1="216" y1="140" x2="250" y2="140" strokeOpacity="0.5" />
              <line x1="216" y1="148" x2="242" y2="148" strokeOpacity="0.5" />
            </motion.g>

            {!compact && (
              <text x="98" y="192" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                DYNAMO · PYTHON · PIPELINE
              </text>
            )}
          </g>
        )}

        {/* 9. AI + Rhino + Revit R Fusion Triad */}
        {artworkKey === "ai-bim" && (
          <g>
            {/* Orbital connection ring */}
            <motion.circle
              cx="160"
              cy="110"
              r="62"
              stroke={primaryStroke}
              strokeOpacity="0.25"
              strokeWidth="1"
              strokeDasharray="4 4"
              style={reduced ? undefined : { rotate: rotDeg, transformOrigin: "160px 110px" }}
            />

            {/* Connection triangular graph */}
            <g stroke={accentStroke} strokeOpacity="0.65" strokeWidth="1.15">
              <line x1="160" y1="54" x2="104" y2="146" />
              <line x1="160" y1="54" x2="216" y2="146" />
              <line x1="104" y1="146" x2="216" y2="146" />
            </g>

            {/* Top: AI 4-point Neural Spark */}
            <motion.g style={reduced ? undefined : { x: shiftX, y: shiftY }}>
              <circle cx="160" cy="54" r="20" fill="var(--background)" stroke={accentStroke} strokeWidth="1.6" />
              <path
                d="M 160 39 Q 162 52 175 54 Q 162 56 160 69 Q 158 56 145 54 Q 158 52 160 39 Z"
                stroke={accentStroke}
                strokeWidth="1.5"
                fill="none"
              />
            </motion.g>

            {/* Bottom-left: Mini Rhino Wireframe */}
            <motion.g
              style={reduced ? undefined : { x: slowX, y: slowY }}
              stroke={primaryStroke}
              strokeWidth="1.45"
              strokeLinejoin="round"
            >
              <circle cx="104" cy="146" r="22" fill="var(--background)" />
              <path d="M 88 154 L 94 141 L 108 139 L 118 133 L 116 145 L 122 149 L 112 155 Z" />
            </motion.g>

            {/* Bottom-right: Mini Revit "R" */}
            <motion.g
              style={reduced ? undefined : { x: slowX, y: tiltDeg }}
              stroke={primaryStroke}
              strokeWidth="1.55"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <circle cx="216" cy="146" r="22" fill="var(--background)" />
              <path d="M 209 158 L 209 135 L 220 135 C 224 135 226 138 226 141 C 226 145 224 147 220 147 L 227 158 M 209 147 L 220 147" />
            </motion.g>

            {!compact && (
              <text x="108" y="196" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.55">
                AI AGENTS · RHINO · BIM
              </text>
            )}
          </g>
        )}
      </motion.svg>
    </div>
  );
}
