// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: the parser is one intentional per-command switch — splitting it would scatter the coordinate/reflection state and hurt readability.
// biome-ignore-all lint/suspicious/noAssignInExpressions: `nums[i++]` cursor reads keep the command-arg consumption compact and are local to this parser.
// biome-ignore-all lint/style/useConsistentTypeDefinitions: object-literal point/command types read better than interfaces for this geometry data.

// A small SVG path-data parser tailored to the "Jedd Lab" x-ray. It turns a
// `d` string into a flat list of absolute drawing commands plus the points that
// matter for inspection: anchor points (on-curve vertices) and control points
// (off-curve Bézier / arc-endpoint handles). Coordinates stay in the icon's
// native 0–24 user space; the Lab component scales them for display.
//
// Jedd icons are flat, stroke-only geometry authored to a 24×24 grid, so we
// only need the command set the source SVGs actually use: M/L/H/V/C/S/Q/T/A/Z
// (absolute + relative). This is intentionally not a full SVG path engine.

type Point = { x: number; y: number };

type PathCommand = {
  /** Absolute command letter (M, L, C, Q, A, Z, …). */
  command: string;
  /** Original letter as authored, preserving relative (lowercase) casing. */
  raw: string;
  /** The on-curve endpoint this command lands on (undefined for Z). */
  end?: Point;
  /** Off-curve control points for curve commands, in draw order. */
  controls: Point[];
  /** The absolute numeric args, for the inspector's command list. */
  args: number[];
};

type ParsedPath = {
  commands: PathCommand[];
  /** All on-curve vertices, de-duplicated by position. */
  anchors: Point[];
  /** All off-curve control/handle points. */
  controls: Point[];
  /** Handle segments linking a control point to its owning anchor. */
  handles: { from: Point; to: Point }[];
};

const NUMBER_RE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

/** Split a `d` string into [letter, ...numbers] command groups. */
function tokenize(d: string): { letter: string; nums: number[] }[] {
  const groups: { letter: string; nums: number[] }[] = [];
  const re = /([a-zA-Z])([^a-zA-Z]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const letter = m[1];
    const nums = (m[2].match(NUMBER_RE) ?? []).map(Number);
    groups.push({ letter, nums });
  }
  return groups;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Parse a single subpath `d` string into absolute commands and inspection
 * points. Multiple `M` commands (compound paths) are handled — Z closes back to
 * the most recent subpath start.
 */
function parsePath(d: string): ParsedPath {
  const commands: PathCommand[] = [];
  const anchors: Point[] = [];
  const controls: Point[] = [];
  const handles: { from: Point; to: Point }[] = [];

  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  // Reflection state for smooth S/T commands.
  let prevControl: Point | null = null;

  const pushAnchor = (p: Point) => anchors.push(p);

  for (const { letter, nums } of tokenize(d)) {
    const abs = letter.toUpperCase();
    const rel = letter !== abs;
    // Consume args in the per-command arity; extra args repeat the command
    // (per the SVG spec, e.g. "L 1 2 3 4" is two line-tos).
    let i = 0;
    const takeX = (n: number) => (rel ? cx + n : n);
    const takeY = (n: number) => (rel ? cy + n : n);

    const commit = (
      cmd: string,
      end: Point | undefined,
      ctrls: Point[],
      args: number[]
    ) => {
      commands.push({ command: cmd, raw: letter, end, controls: ctrls, args });
    };

    switch (abs) {
      case "M": {
        do {
          const x = takeX(nums[i++]);
          const y = takeY(nums[i++]);
          cx = round(x);
          cy = round(y);
          // A trailing pair after the first M is an implicit L, but the moveto
          // still starts a subpath.
          startX = cx;
          startY = cy;
          const end = { x: cx, y: cy };
          pushAnchor(end);
          commit(i <= 2 ? "M" : "L", end, [], [cx, cy]);
          prevControl = null;
        } while (i < nums.length);
        break;
      }
      case "L": {
        do {
          cx = round(takeX(nums[i++]));
          cy = round(takeY(nums[i++]));
          const end = { x: cx, y: cy };
          pushAnchor(end);
          commit("L", end, [], [cx, cy]);
          prevControl = null;
        } while (i < nums.length);
        break;
      }
      case "H": {
        do {
          cx = round(rel ? cx + nums[i++] : nums[i++]);
          const end = { x: cx, y: cy };
          pushAnchor(end);
          commit("H", end, [], [cx]);
          prevControl = null;
        } while (i < nums.length);
        break;
      }
      case "V": {
        do {
          cy = round(rel ? cy + nums[i++] : nums[i++]);
          const end = { x: cx, y: cy };
          pushAnchor(end);
          commit("V", end, [], [cy]);
          prevControl = null;
        } while (i < nums.length);
        break;
      }
      case "C": {
        do {
          const prevEnd = { x: cx, y: cy };
          const c1 = { x: round(takeX(nums[i++])), y: round(takeY(nums[i++])) };
          const c2 = { x: round(takeX(nums[i++])), y: round(takeY(nums[i++])) };
          cx = round(takeX(nums[i++]));
          cy = round(takeY(nums[i++]));
          const end = { x: cx, y: cy };
          // c1 is the outgoing handle of the previous anchor; c2 the incoming
          // handle of this segment's endpoint.
          controls.push(c1, c2);
          handles.push({ from: prevEnd, to: c1 }, { from: end, to: c2 });
          pushAnchor(end);
          commit("C", end, [c1, c2], [c1.x, c1.y, c2.x, c2.y, cx, cy]);
          prevControl = c2;
        } while (i < nums.length);
        break;
      }
      case "S": {
        do {
          const reflected = prevControl
            ? {
                x: round(2 * cx - prevControl.x),
                y: round(2 * cy - prevControl.y),
              }
            : { x: cx, y: cy };
          const c2 = { x: round(takeX(nums[i++])), y: round(takeY(nums[i++])) };
          const prevEnd = { x: cx, y: cy };
          cx = round(takeX(nums[i++]));
          cy = round(takeY(nums[i++]));
          const end = { x: cx, y: cy };
          controls.push(reflected, c2);
          handles.push({ from: prevEnd, to: reflected }, { from: end, to: c2 });
          pushAnchor(end);
          commit("S", end, [reflected, c2], [c2.x, c2.y, cx, cy]);
          prevControl = c2;
        } while (i < nums.length);
        break;
      }
      case "Q": {
        do {
          const prevEnd = { x: cx, y: cy };
          const c1 = { x: round(takeX(nums[i++])), y: round(takeY(nums[i++])) };
          cx = round(takeX(nums[i++]));
          cy = round(takeY(nums[i++]));
          const end = { x: cx, y: cy };
          controls.push(c1);
          handles.push({ from: prevEnd, to: c1 }, { from: end, to: c1 });
          pushAnchor(end);
          commit("Q", end, [c1], [c1.x, c1.y, cx, cy]);
          prevControl = c1;
        } while (i < nums.length);
        break;
      }
      case "T": {
        do {
          const prevEnd = { x: cx, y: cy };
          const c1: Point = prevControl
            ? {
                x: round(2 * cx - prevControl.x),
                y: round(2 * cy - prevControl.y),
              }
            : { x: cx, y: cy };
          cx = round(takeX(nums[i++]));
          cy = round(takeY(nums[i++]));
          const end = { x: cx, y: cy };
          controls.push(c1);
          handles.push({ from: prevEnd, to: c1 }, { from: end, to: c1 });
          pushAnchor(end);
          commit("T", end, [c1], [cx, cy]);
          prevControl = c1;
        } while (i < nums.length);
        break;
      }
      case "A": {
        do {
          const rx = nums[i++];
          const ry = nums[i++];
          const rot = nums[i++];
          const large = nums[i++];
          const sweep = nums[i++];
          cx = round(takeX(nums[i++]));
          cy = round(takeY(nums[i++]));
          const end = { x: cx, y: cy };
          pushAnchor(end);
          commit("A", end, [], [rx, ry, rot, large, sweep, cx, cy]);
          prevControl = null;
        } while (i < nums.length);
        break;
      }
      case "Z": {
        cx = startX;
        cy = startY;
        commit("Z", undefined, [], []);
        prevControl = null;
        break;
      }
      default:
        // Unknown command — skip rather than throw so one odd icon can't blank
        // the whole Lab.
        break;
    }
  }

  return {
    commands,
    anchors: dedupe(anchors),
    controls: dedupe(controls),
    handles,
  };
}

function dedupe(points: Point[]): Point[] {
  const seen = new Set<string>();
  const out: Point[] = [];
  for (const p of points) {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export type IconNodeChild = [
  tag: string,
  attrs: Record<string, string | number>,
  children?: IconNodeChild[],
];

/** A single drawable piece of an icon: one element and its parsed geometry. */
export type IconPiece = {
  index: number;
  tag: string;
  attrs: Record<string, string | number>;
  /** The `d` string for path pieces; empty for primitives (circle/rect/line). */
  d: string;
  parsed: ParsedPath;
};

/**
 * Flatten an IconNode tree into drawable pieces, parsing each path's `d`. Non-
 * path primitives (circle, rect, line, polyline, polygon) are returned with an
 * empty parse — they still render, but have no anchor/command breakdown.
 */
export function flattenPieces(node: IconNodeChild[]): IconPiece[] {
  const pieces: IconPiece[] = [];
  const walk = (children: IconNodeChild[]) => {
    for (const [tag, attrs, nested] of children) {
      const d = typeof attrs.d === "string" ? attrs.d : "";
      pieces.push({
        index: pieces.length,
        tag,
        attrs,
        d,
        parsed: d
          ? parsePath(d)
          : { commands: [], anchors: [], controls: [], handles: [] },
      });
      if (nested) {
        walk(nested);
      }
    }
  };
  walk(node);
  return pieces;
}
