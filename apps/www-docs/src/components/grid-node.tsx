// Decorative crosshair marker centered on a cell's top-left grid intersection.
// The grid gap line sits at the cell's exact top/left edge (x=0, y=0). Each arm
// is an odd-length 1px bar offset by whole integer pixels so it snaps to the
// device pixel grid instead of landing on a half-pixel (which blurs / shifts it).
const ARM = 7; // total arm length in px (odd, so the 1px line is dead-centered)
const HALF = (ARM - 1) / 2; // 3px on each side of the center pixel

// A single crosshair (horizontal + vertical arm) anchored to one cell corner.
// `x`/`y` pick which corner: 0 = the leading edge (gap line at -1), 1 = the
// trailing edge (gap line just past the cell, at 100%). Cells on the grid's
// outer right/bottom edges use the trailing variants so those intersections —
// which no neighbouring cell owns — still get a crosshair.
function Crosshair({ x, y }: { x: 0 | 1; y: 0 | 1 }) {
  // The outer border line sits 1px outside the cell box on every side, so both
  // the leading and trailing edges live at -1 — the trailing arms mirror the
  // leading ones exactly (same -HALF - 1 centering, just anchored right/bottom).
  const hStyle =
    x === 0 ? { left: -HALF - 1 } : ({ right: -HALF - 1 } as const);
  const vStyle =
    y === 0 ? { top: -HALF - 1 } : ({ bottom: -HALF - 1 } as const);
  const hEdge = y === 0 ? { top: -1 } : ({ bottom: -1 } as const);
  const vEdge = x === 0 ? { left: -1 } : ({ right: -1 } as const);
  return (
    <>
      {/* horizontal arm: 1px tall, centered on the corner, on the edge line */}
      <span
        className="absolute bg-border"
        style={{ ...hStyle, ...hEdge, width: ARM, height: 1 }}
      />
      {/* vertical arm: 1px wide, centered on the corner, on the edge line */}
      <span
        className="absolute bg-border"
        style={{ ...vEdge, ...vStyle, width: 1, height: ARM }}
      />
    </>
  );
}

// Draws the top-left crosshair of every cell, plus the mirrored right/bottom
// crosshairs for cells that sit on the grid's outer edges (`lastCol`/`lastRow`)
// so the whole perimeter is decorated, not just the interior intersections.
export function GridNode({
  lastCol = false,
  lastRow = false,
}: {
  lastCol?: boolean;
  lastRow?: boolean;
} = {}) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10">
      <Crosshair x={0} y={0} />
      {lastCol && <Crosshair x={1} y={0} />}
      {lastRow && <Crosshair x={0} y={1} />}
      {lastCol && lastRow && <Crosshair x={1} y={1} />}
    </span>
  );
}

// Bright registration brackets shown on the four corners of the selected cell.
// Reuses the grid's own line language (1px arms, integer-pixel snapped) but at
// full foreground strength and pointing INWARD from each corner — an L-bracket.
const BRACKET = 10; // arm length in px

export function SelectedCorners() {
  // Each corner = one horizontal + one vertical arm meeting at the cell corner.
  // Coordinates are integer px relative to the cell box (0,0 top-left).
  const corners = [
    { id: "tl", h: { left: -1, top: -1 }, v: { left: -1, top: -1 } }, // top-left
    { id: "tr", h: { right: -1, top: -1 }, v: { right: -1, top: -1 } }, // top-right
    { id: "bl", h: { left: -1, bottom: -1 }, v: { left: -1, bottom: -1 } }, // bottom-left
    { id: "br", h: { right: -1, bottom: -1 }, v: { right: -1, bottom: -1 } }, // bottom-right
  ];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {corners.map((c) => (
        <span key={`corner-${c.id}`}>
          <span
            className="absolute bg-foreground"
            style={{ ...c.h, width: BRACKET, height: 1 }}
          />
          <span
            className="absolute bg-foreground"
            style={{ ...c.v, width: 1, height: BRACKET }}
          />
        </span>
      ))}
    </span>
  );
}
