// Decorative crosshairs on the grid's intersections. Arms are odd-length 1px
// bars at whole-pixel offsets, so they stay centered and crisp.
const ARM = 7;
const HALF = (ARM - 1) / 2;

// One crosshair on a cell corner: `x`/`y` 0 = leading edge, 1 = trailing. The
// border line sits 1px outside the cell on every side, hence the -1s.
function Crosshair({ x, y }: { x: 0 | 1; y: 0 | 1 }) {
  const hStyle =
    x === 0 ? { left: -HALF - 1 } : ({ right: -HALF - 1 } as const);
  const vStyle =
    y === 0 ? { top: -HALF - 1 } : ({ bottom: -HALF - 1 } as const);
  const hEdge = y === 0 ? { top: -1 } : ({ bottom: -1 } as const);
  const vEdge = x === 0 ? { left: -1 } : ({ right: -1 } as const);
  return (
    <>
      <span
        className="absolute bg-border"
        style={{ ...hStyle, ...hEdge, width: ARM, height: 1 }}
      />
      <span
        className="absolute bg-border"
        style={{ ...vEdge, ...vStyle, width: 1, height: ARM }}
      />
    </>
  );
}

// Every cell draws its top-left crosshair; cells on the outer right/bottom edges
// also draw the corners no neighbour owns.
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

// L-brackets on the four corners of the selected cell.
const BRACKET = 10;

export function SelectedCorners() {
  const corners = [
    { id: "tl", h: { left: -1, top: -1 }, v: { left: -1, top: -1 } },
    { id: "tr", h: { right: -1, top: -1 }, v: { right: -1, top: -1 } },
    { id: "bl", h: { left: -1, bottom: -1 }, v: { left: -1, bottom: -1 } },
    { id: "br", h: { right: -1, bottom: -1 }, v: { right: -1, bottom: -1 } },
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
