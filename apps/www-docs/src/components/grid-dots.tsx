interface GridDotProps {
  className?: string;
  left: React.CSSProperties["left"];
  top: React.CSSProperties["top"];
  x?: "left" | "interior" | "right";
  y?: "top" | "interior" | "bottom" | "outer-bottom";
}

function GridDot({
  className = "",
  left,
  top,
  x = "interior",
  y = "interior",
}: GridDotProps) {
  const xOffset = x === "right" ? "0.5px" : "-0.5px";
  const yOffset = y === "bottom" ? "-0.5px" : "0.5px";

  return (
    <span
      aria-hidden="true"
      className={["grid-dot", className].filter(Boolean).join(" ")}
      style={
        {
          left,
          top,
          "--grid-dot-x": xOffset,
          "--grid-dot-y": yOffset,
        } as React.CSSProperties
      }
    />
  );
}

export interface GridDotLine {
  className?: string;
  position: React.CSSProperties["left"];
}

export function gridColumns(count: number, className?: string): GridDotLine[] {
  return Array.from({ length: count + 1 }, (_, index) => ({
    className,
    position: `${(index / count) * 100}%`,
  }));
}

export function responsiveGridColumns(base: number, sm: number): GridDotLine[] {
  const basePositions = new Set(
    gridColumns(base).map((column) => column.position)
  );

  return gridColumns(sm).map((column) => ({
    ...column,
    className: basePositions.has(column.position) ? undefined : "max-sm:hidden",
  }));
}

function xPlacement(position: React.CSSProperties["left"]) {
  if (position === 0 || position === "0%") {
    return "left";
  }

  if (position === "100%") {
    return "right";
  }

  return "interior";
}

interface GridDotsProps {
  columns: GridDotLine[];
  row: React.CSSProperties["top"];
  y: GridDotProps["y"];
}

export function GridDots({ columns, row, y }: GridDotsProps) {
  return (
    <>
      {columns.map((column) => (
        <GridDot
          className={column.className}
          key={`${row}-${column.position}`}
          left={column.position}
          top={row}
          x={xPlacement(column.position)}
          y={y}
        />
      ))}
    </>
  );
}
