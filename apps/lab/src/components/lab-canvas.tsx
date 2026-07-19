// biome-ignore-all lint/suspicious/noArrayIndexKey: grid lines and per-vertex overlays are positional, fixed-length, and never reorder — the index is the stable identity.

import { useMemo, useRef, useState } from "react";
import { marginReport } from "@/lib/margin";
import type { IconNodeChild, IconPiece } from "@/lib/svg-path";
import { flattenPieces } from "@/lib/svg-path";

/** The icon's native user-space size — Jedd icons are authored to 24×24. */
const VIEW = 24;

// A palette to tint each drawable piece distinctly when "per-piece" is on. Kept
// theme-agnostic (mid-tone hues legible on both light and dark backgrounds).
const PIECE_COLORS = [
  "#3b82f6", // blue
  "#ec4899", // pink
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ef4444", // red
  "#eab308", // yellow
];

/** Renders one drawable piece (path/circle/rect/line) with optional tinting. */
function PieceShape({
  piece,
  dimmed,
  perPiece,
  fill,
}: {
  piece: IconPiece;
  dimmed: boolean;
  perPiece: boolean;
  fill: boolean;
}) {
  const color = perPiece
    ? PIECE_COLORS[piece.index % PIECE_COLORS.length]
    : undefined;
  const { attrs } = piece;
  const common = {
    opacity: dimmed ? 0.12 : 1,
    // Forward any element transform (e.g. rotate()) so primitives render in
    // place — the source SVG relies on it (see rows-2's rotated rect).
    ...(typeof attrs.transform === "string"
      ? { transform: attrs.transform }
      : {}),
    ...(color
      ? { stroke: fill ? "none" : color, fill: fill ? color : "none" }
      : {}),
  };

  switch (piece.tag) {
    case "path":
      return <path d={piece.d} {...common} />;
    case "circle":
      return (
        <circle
          cx={Number(attrs.cx)}
          cy={Number(attrs.cy)}
          r={Number(attrs.r)}
          {...common}
        />
      );
    case "rect":
      return (
        <rect
          height={Number(attrs.height)}
          rx={attrs.rx ? Number(attrs.rx) : undefined}
          width={Number(attrs.width)}
          x={Number(attrs.x)}
          y={Number(attrs.y)}
          {...common}
        />
      );
    case "line":
      return (
        <line
          x1={Number(attrs.x1)}
          x2={Number(attrs.x2)}
          y1={Number(attrs.y1)}
          y2={Number(attrs.y2)}
          {...common}
        />
      );
    default:
      return null;
  }
}

export interface LabCanvasProps {
  fill: boolean;
  /** Index of the piece to isolate, or null to show all. */
  isolatedPiece: number | null;
  node: IconNodeChild[];
  perPiece: boolean;
  /** Rendered pixel size of the whole grid (square). */
  pixelSize: number;
  showAnchors: boolean;
  /** Draw the geometry's bounding box, tinted red where it breaks the margin. */
  showBounds: boolean;
  showControls: boolean;
  showGrid: boolean;
  showKeylines: boolean;
  strokeWidth: number;
}

export function LabCanvas({
  node,
  pixelSize,
  strokeWidth,
  showGrid,
  showKeylines,
  showAnchors,
  showBounds,
  showControls,
  perPiece,
  isolatedPiece,
  fill,
}: LabCanvasProps) {
  const pieces = useMemo(() => flattenPieces(node), [node]);
  const report = useMemo(() => marginReport(pieces), [pieces]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  // The unit → pixel scale, used to keep anchor dots / handles a constant
  // on-screen size regardless of zoom.
  const scale = pixelSize / VIEW;
  const dot = 3.2 / scale; // anchor radius in user units
  const ctrlDot = 2.4 / scale;
  const hairline = 1 / scale;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW;
    setHover({ x, y });
  };

  return (
    <div
      className="relative select-none bg-background"
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        aria-label="Icon x-ray"
        height={pixelSize}
        onPointerLeave={() => setHover(null)}
        onPointerMove={onMove}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width={pixelSize}
      >
        {/* ── Pixel grid ─────────────────────────────────────────── */}
        {showGrid && (
          <g
            className="text-gray-500/50"
            stroke="currentColor"
            strokeWidth={hairline / 2}
          >
            {Array.from({ length: VIEW + 1 }, (_, i) => (
              <line key={`v${i}`} x1={i} x2={i} y1={0} y2={VIEW} />
            ))}
            {Array.from({ length: VIEW + 1 }, (_, i) => (
              <line key={`h${i}`} x1={0} x2={VIEW} y1={i} y2={i} />
            ))}
          </g>
        )}

        {/* ── Keylines / safe-area guides ────────────────────────── */}
        {showKeylines && (
          <g fill="none" stroke="currentColor" strokeWidth={hairline}>
            {/* Center cross */}
            <g className="text-sky-500/50">
              <line x1={VIEW / 2} x2={VIEW / 2} y1={0} y2={VIEW} />
              <line x1={0} x2={VIEW} y1={VIEW / 2} y2={VIEW / 2} />
            </g>
            {/* 1px minimum margin — a hard rule: no artwork past this on any
                side. Drawn boldest of the guides since it's a constraint, not a
                proportion hint. */}
            <rect
              className="text-rose-500/80"
              height={VIEW - 2}
              strokeDasharray={`${hairline * 2} ${hairline}`}
              strokeWidth={hairline * 1.5}
              width={VIEW - 2}
              x={1}
              y={1}
            />
            {/* 2px live-area inset (the standard 20px content box) */}
            <rect
              className="text-amber-500/60"
              height={VIEW - 4}
              width={VIEW - 4}
              x={2}
              y={2}
            />
            {/* Keyline circle + square proportion guides */}
            <g className="text-fuchsia-500/40">
              <circle cx={VIEW / 2} cy={VIEW / 2} r={VIEW / 2 - 2} />
              <rect height={VIEW - 8} width={VIEW - 8} x={4} y={4} />
            </g>
          </g>
        )}

        {/* ── Icon geometry ──────────────────────────────────────── */}
        {/* Cap/join match the canonical stroke defaults (butt/miter) so the
            x-ray renders identically to the published icons — Jedd icons are
            sharp/squared, not rounded. See tools/build-icons/clean-svgs.ts. */}
        <g
          fill={fill ? "currentColor" : "none"}
          stroke={fill ? "none" : "currentColor"}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeWidth={strokeWidth}
        >
          {pieces.map((piece) => (
            <PieceShape
              dimmed={isolatedPiece !== null && isolatedPiece !== piece.index}
              fill={fill}
              key={piece.index}
              perPiece={perPiece}
              piece={piece}
            />
          ))}
        </g>

        {/* ── Control-point handles ──────────────────────────────── */}
        {showControls && (
          <g>
            {pieces.map((piece) => {
              if (isolatedPiece !== null && isolatedPiece !== piece.index) {
                return null;
              }
              return (
                <g key={`ctrl-${piece.index}`}>
                  {piece.parsed.handles.map((h, i) => (
                    <line
                      className="text-emerald-500/70"
                      key={`h-${piece.index}-${i}`}
                      stroke="currentColor"
                      strokeDasharray={`${hairline * 2} ${hairline * 2}`}
                      strokeWidth={hairline}
                      x1={h.from.x}
                      x2={h.to.x}
                      y1={h.from.y}
                      y2={h.to.y}
                    />
                  ))}
                  {piece.parsed.controls.map((c, i) => (
                    <rect
                      className="text-emerald-500"
                      fill="currentColor"
                      height={ctrlDot}
                      key={`c-${piece.index}-${i}`}
                      width={ctrlDot}
                      x={c.x - ctrlDot / 2}
                      y={c.y - ctrlDot / 2}
                    />
                  ))}
                </g>
              );
            })}
          </g>
        )}

        {/* ── Anchor points ──────────────────────────────────────── */}
        {showAnchors && (
          <g>
            {pieces.map((piece) => {
              if (isolatedPiece !== null && isolatedPiece !== piece.index) {
                return null;
              }
              return piece.parsed.anchors.map((a, i) => (
                <circle
                  className="text-red-500"
                  cx={a.x}
                  cy={a.y}
                  fill="currentColor"
                  key={`a-${piece.index}-${i}`}
                  r={dot}
                  stroke="white"
                  strokeWidth={hairline}
                />
              ));
            })}
          </g>
        )}

        {/* ── Geometry bounds + margin violations ────────────────── */}
        {showBounds && report.bbox && (
          <g fill="none" pointerEvents="none">
            <rect
              className={
                report.violates ? "text-rose-500" : "text-emerald-500/70"
              }
              height={report.bbox.maxY - report.bbox.minY}
              stroke="currentColor"
              strokeDasharray={`${hairline * 3} ${hairline * 2}`}
              strokeWidth={hairline}
              width={report.bbox.maxX - report.bbox.minX}
              x={report.bbox.minX}
              y={report.bbox.minY}
            />
            {/* Solid red mark on each side that breaks the margin. */}
            <g
              className="text-rose-500"
              stroke="currentColor"
              strokeWidth={hairline * 2}
            >
              {report.sides.left > 0 && (
                <line
                  x1={report.bbox.minX}
                  x2={report.bbox.minX}
                  y1={report.bbox.minY}
                  y2={report.bbox.maxY}
                />
              )}
              {report.sides.right > 0 && (
                <line
                  x1={report.bbox.maxX}
                  x2={report.bbox.maxX}
                  y1={report.bbox.minY}
                  y2={report.bbox.maxY}
                />
              )}
              {report.sides.top > 0 && (
                <line
                  x1={report.bbox.minX}
                  x2={report.bbox.maxX}
                  y1={report.bbox.minY}
                  y2={report.bbox.minY}
                />
              )}
              {report.sides.bottom > 0 && (
                <line
                  x1={report.bbox.minX}
                  x2={report.bbox.maxX}
                  y1={report.bbox.maxY}
                  y2={report.bbox.maxY}
                />
              )}
            </g>
          </g>
        )}

        {/* ── Hover crosshair ────────────────────────────────────── */}
        {hover && (
          <g
            className="text-sky-500"
            pointerEvents="none"
            stroke="currentColor"
            strokeWidth={hairline}
          >
            <line x1={hover.x} x2={hover.x} y1={0} y2={VIEW} />
            <line x1={0} x2={VIEW} y1={hover.y} y2={hover.y} />
          </g>
        )}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute top-1 left-1 rounded-none border border-border bg-background/90 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
          {hover.x.toFixed(1)}, {hover.y.toFixed(1)}
        </div>
      )}
    </div>
  );
}
