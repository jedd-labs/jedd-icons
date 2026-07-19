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

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

const EMPTY_BBOX: BBox = {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
};

function extendBox(box: BBox, x: number, y: number): void {
  box.minX = Math.min(box.minX, x);
  box.minY = Math.min(box.minY, y);
  box.maxX = Math.max(box.maxX, x);
  box.maxY = Math.max(box.maxY, y);
}

function extendAxis(box: BBox, axis: "x" | "y", v: number): void {
  if (axis === "x") {
    box.minX = Math.min(box.minX, v);
    box.maxX = Math.max(box.maxX, v);
  } else {
    box.minY = Math.min(box.minY, v);
    box.maxY = Math.max(box.maxY, v);
  }
}

// Real extremes of a cubic Bézier — where its derivative is 0 on each axis —
// so a curve that bulges past its anchors is measured correctly, not clipped to
// its endpoints. Falls back to endpoint sampling for the quadratic case.
function extendCubic(
  box: BBox,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): void {
  extendBox(box, p0.x, p0.y);
  extendBox(box, p3.x, p3.y);
  for (const axis of ["x", "y"] as const) {
    const a = -p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis];
    const b = 2 * (p0[axis] - 2 * p1[axis] + p2[axis]);
    const c = -p0[axis] + p1[axis];
    const roots = solveQuadratic(a * 3, b * 3, c * 3);
    for (const t of roots) {
      if (t > 0 && t < 1) {
        const mt = 1 - t;
        const v =
          mt * mt * mt * p0[axis] +
          3 * mt * mt * t * p1[axis] +
          3 * mt * t * t * p2[axis] +
          t * t * t * p3[axis];
        extendAxis(box, axis, v);
      }
    }
  }
}

function solveQuadratic(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-9) {
    return Math.abs(b) < 1e-9 ? [] : [-c / b];
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    return [];
  }
  const sq = Math.sqrt(disc);
  return [(-b + sq) / (2 * a), (-b - sq) / (2 * a)];
}

/** The extent corners of a primitive (circle/rect/line) before any transform. */
function primitiveCorners(piece: IconPiece): Point[] {
  const a = piece.attrs;
  if (piece.tag === "circle") {
    const cx = Number(a.cx);
    const cy = Number(a.cy);
    const r = Number(a.r);
    return [
      { x: cx - r, y: cy - r },
      { x: cx + r, y: cy - r },
      { x: cx + r, y: cy + r },
      { x: cx - r, y: cy + r },
    ];
  }
  if (piece.tag === "rect") {
    const x = Number(a.x);
    const y = Number(a.y);
    const w = Number(a.width);
    const h = Number(a.height);
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  if (piece.tag === "line") {
    return [
      { x: Number(a.x1), y: Number(a.y1) },
      { x: Number(a.x2), y: Number(a.y2) },
    ];
  }
  return [];
}

/**
 * Parse the subset of SVG transforms the source icons actually use (only
 * `rotate(a cx cy)` appears today) into a point mapper. Unknown transforms map
 * to identity so a bbox is still produced rather than a false violation.
 */
const ROTATE_RE =
  /rotate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+))?\s*\)/;

function parseTransform(transform: string): (p: Point) => Point {
  const rotate = transform.match(ROTATE_RE);
  if (rotate) {
    const deg = Number(rotate[1]);
    const cx = rotate[2] === undefined ? 0 : Number(rotate[2]);
    const cy = rotate[3] === undefined ? 0 : Number(rotate[3]);
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return ({ x, y }) => {
      const dx = x - cx;
      const dy = y - cy;
      return {
        x: round(cx + dx * cos - dy * sin),
        y: round(cy + dx * sin + dy * cos),
      };
    };
  }
  return (p) => p;
}

/**
 * Tight bounding box of an icon's geometry in 0–24 user space, measured on the
 * path centerline (stroke width is not added — the margin is an authoring rule
 * about where geometry sits). Curves are sampled at their true extremes.
 */
export function boundingBox(pieces: IconPiece[]): BBox | null {
  const box: BBox = { ...EMPTY_BBOX };

  for (const piece of pieces) {
    if (piece.tag === "path") {
      let pen: Point = { x: 0, y: 0 };
      for (const cmd of piece.parsed.commands) {
        if (cmd.command === "C" && cmd.controls.length === 2 && cmd.end) {
          extendCubic(box, pen, cmd.controls[0], cmd.controls[1], cmd.end);
        } else if (
          cmd.command === "Q" &&
          cmd.controls.length === 1 &&
          cmd.end
        ) {
          // Elevate the quadratic to a cubic and reuse the extrema solver.
          const c1 = {
            x: pen.x + (2 / 3) * (cmd.controls[0].x - pen.x),
            y: pen.y + (2 / 3) * (cmd.controls[0].y - pen.y),
          };
          const c2 = {
            x: cmd.end.x + (2 / 3) * (cmd.controls[0].x - cmd.end.x),
            y: cmd.end.y + (2 / 3) * (cmd.controls[0].y - cmd.end.y),
          };
          extendCubic(box, pen, c1, c2, cmd.end);
        } else if (cmd.end) {
          extendBox(box, cmd.end.x, cmd.end.y);
        }
        if (cmd.end) {
          pen = cmd.end;
        }
      }
      // Curves whose extrema we couldn't fold above still contribute anchors.
      for (const a of piece.parsed.anchors) {
        extendBox(box, a.x, a.y);
      }
    } else {
      // Primitives (circle/rect/line) contribute their extent corners, mapped
      // through any `transform` on the element (e.g. rotate()).
      const corners = primitiveCorners(piece);
      const xf = parseTransform(
        typeof piece.attrs.transform === "string" ? piece.attrs.transform : ""
      );
      for (const p of corners) {
        const t = xf(p);
        extendBox(box, t.x, t.y);
      }
    }
  }

  return Number.isFinite(box.minX) ? box : null;
}

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
