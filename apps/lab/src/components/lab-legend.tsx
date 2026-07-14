export interface LabLegendProps {
  showAnchors: boolean;
  showBounds: boolean;
  showControls: boolean;
  showGrid: boolean;
  showKeylines: boolean;
}

type Swatch =
  | "grid"
  | "margin"
  | "live"
  | "keyline"
  | "center"
  | "anchor"
  | "control"
  | "bounds"
  | "hover";

/** A tiny colored glyph matching how the marker is drawn on the canvas. */
function LegendSwatch({ kind }: { kind: Swatch }) {
  switch (kind) {
    case "grid":
      return (
        <span
          aria-hidden
          className="inline-block size-3 border border-border"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
      );
    case "margin":
      return (
        <span
          aria-hidden
          className="inline-block size-3 border border-rose-500/80 border-dashed"
        />
      );
    case "live":
      return (
        <span
          aria-hidden
          className="inline-block size-3 border border-amber-500/60"
        />
      );
    case "keyline":
      return (
        <span
          aria-hidden
          className="inline-block size-3 rounded-full border border-fuchsia-500/40"
        />
      );
    case "center":
      return (
        <span aria-hidden className="relative inline-block size-3">
          <span className="absolute inset-x-0 top-1/2 h-px bg-sky-500/50" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-sky-500/50" />
        </span>
      );
    case "anchor":
      return (
        <span
          aria-hidden
          className="inline-block size-2.5 rounded-full border border-white bg-red-500"
        />
      );
    case "control":
      return (
        <span aria-hidden className="inline-block size-2.5 bg-emerald-500" />
      );
    case "bounds":
      return (
        <span
          aria-hidden
          className="inline-block size-3 border border-rose-500 border-dashed"
        />
      );
    case "hover":
      return (
        <span aria-hidden className="relative inline-block size-3">
          <span className="absolute inset-x-0 top-1/2 h-px bg-sky-500" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-sky-500" />
        </span>
      );
    default:
      return null;
  }
}

interface Entry {
  /** When false, the row is shown dimmed because its overlay is toggled off. */
  active: boolean;
  hint: string;
  kind: Swatch;
  label: string;
}

export function LabLegend({
  showGrid,
  showKeylines,
  showAnchors,
  showBounds,
  showControls,
}: LabLegendProps) {
  const entries: Entry[] = [
    {
      kind: "grid",
      label: "Pixel grid",
      hint: "Each square = 1 unit (24×24)",
      active: showGrid,
    },
    {
      kind: "margin",
      label: "1px margin",
      hint: "Hard rule — keep artwork inside",
      active: showKeylines,
    },
    {
      kind: "live",
      label: "Live area",
      hint: "2px inset — target content box",
      active: showKeylines,
    },
    {
      kind: "keyline",
      label: "Keyline shapes",
      hint: "Circle + square proportion guides",
      active: showKeylines,
    },
    {
      kind: "center",
      label: "Center axes",
      hint: "12,12 — check symmetry",
      active: showKeylines,
    },
    {
      kind: "anchor",
      label: "Anchor point",
      hint: "On-curve vertex",
      active: showAnchors,
    },
    {
      kind: "control",
      label: "Control handle",
      hint: "Off-curve Bézier handle",
      active: showControls,
    },
    {
      kind: "bounds",
      label: "Bounding box",
      hint: "Turns red if it breaks the margin",
      active: showBounds,
    },
    {
      kind: "hover",
      label: "Cursor readout",
      hint: "Live coordinate crosshair",
      active: true,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground">Legend</span>
      <ul className="flex flex-col gap-1.5">
        {entries.map((e) => (
          <li
            className={`flex items-center gap-2 ${e.active ? "" : "opacity-40"}`}
            key={e.kind}
          >
            <span className="flex size-3 shrink-0 items-center justify-center">
              <LegendSwatch kind={e.kind} />
            </span>
            <span className="text-foreground">{e.label}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {e.hint}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
