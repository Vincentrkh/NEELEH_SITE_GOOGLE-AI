"use client";

/**
 * Global SVG defs:
 * - goo-liquid filter — used by .goo-text elements for liquid morph
 *   (high stdDeviation + threshold matrix = sticky blob look)
 *
 * Rendered once near the root; referenced via CSS `filter: url(#goo-liquid)`.
 */
export function GooDefs() {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
      }}
    >
      <defs>
        <filter
          id="goo-liquid"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
