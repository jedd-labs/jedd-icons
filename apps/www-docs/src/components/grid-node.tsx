// Decorative crosshair marker centered on a cell's top-left grid intersection.
// The grid gap line sits at the cell's exact top/left edge (x=0, y=0). Each arm
// is an odd-length 1px bar offset by whole integer pixels so it snaps to the
// device pixel grid instead of landing on a half-pixel (which blurs / shifts it).
const ARM = 7; // total arm length in px (odd, so the 1px line is dead-centered)
const HALF = (ARM - 1) / 2; // 3px on each side of the center pixel

export function GridNode() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-10"
    >
      {/* The gap line occupies the 1px immediately before the cell edge, i.e. at
          x=-1 (vertical) and y=-1 (horizontal). Arms sit on that exact pixel. */}
      {/* horizontal arm: 1px tall, on the gap line at y=-1 */}
      <span
        className="absolute bg-border"
        style={{ left: -HALF - 1, top: -1, width: ARM, height: 1 }}
      />
      {/* vertical arm: 1px wide, on the gap line at x=-1 */}
      <span
        className="absolute bg-border"
        style={{ left: -1, top: -HALF - 1, width: 1, height: ARM }}
      />
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
