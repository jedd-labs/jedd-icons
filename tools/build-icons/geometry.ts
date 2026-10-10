// Pure SVG geometry helpers: parse elements into absolute stroke segments
// (transforms applied). The build uses them to turn circles/rects into path
// data before merging; `compare-icons` reduces strokes to keys that don't
// depend on drawing direction, start point or element type, so a re-export can
// be checked against the committed icon.

export type Point = [x: number, y: number];
/** A line (2 points) or a cubic Bézier (4 points), in absolute coordinates. */
export type Segment = Point[];
/** One continuous stroke: what a single `M…` run of path data draws. */
export interface Subpath {
  closed: boolean;
  segments: Segment[];
}
/** Affine matrix `[a, b, c, d, e, f]`, as in SVG's `matrix()`. */
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

const applyMatrix = (m: Matrix, [x, y]: Point): Point => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const numbers = (s: string) => (s.match(NUMBER) ?? []).map(Number);

function transformStep(fn: string, a: number[]): Matrix {
  switch (fn) {
    case "matrix":
      return a.slice(0, 6) as Matrix;
    case "translate":
      return [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
    case "scale":
      return [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    case "rotate": {
      const rad = ((a[0] ?? 0) * Math.PI) / 180;
      const [cos, sin] = [Math.cos(rad), Math.sin(rad)];
      const [cx, cy] = [a[1] ?? 0, a[2] ?? 0];
      return [
        cos,
        sin,
        -sin,
        cos,
        cx - cos * cx + sin * cy,
        cy - sin * cx - cos * cy,
      ];
    }
    case "skewX":
      return [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    case "skewY":
      return [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    default:
      throw new Error(`unsupported transform "${fn}"`);
  }
}

/** Parse an SVG `transform` attribute into a single matrix. */
function parseTransform(transform: string | undefined): Matrix {
  let m = IDENTITY;
  for (const [, fn, args] of (transform ?? "").matchAll(
    /([a-zA-Z]+)\s*\(([^)]*)\)/g
  )) {
    m = multiply(m, transformStep(fn, numbers(args)));
  }
  return m;
}

// ── Element → subpaths ───────────────────────────────────────────────

interface PathCursor {
  current: Subpath | null;
  point: Point;
  start: Point;
  subpaths: Subpath[];
}

function moveTo(cur: PathCursor, p: Point) {
  cur.point = p;
  cur.start = p;
  cur.current = { closed: false, segments: [] };
  cur.subpaths.push(cur.current);
}

function lineTo(cur: PathCursor, p: Point) {
  cur.current?.segments.push([cur.point, p]);
  cur.point = p;
}

/** Parse path data (M L H V C Z, absolute or relative) into subpaths. */
export function parsePathData(d: string): Subpath[] {
  const tokens = d.match(/[MLHVCZmlhvcz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  const cur: PathCursor = {
    current: null,
    point: [0, 0],
    start: [0, 0],
    subpaths: [],
  };
  let i = 0;
  let cmd = "";
  const next = () => Number(tokens?.[i++]);
  while (tokens && i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) {
      cmd = tokens[i++];
    }
    const rel = cmd === cmd.toLowerCase();
    const [ox, oy] = rel ? cur.point : [0, 0];
    switch (cmd.toUpperCase()) {
      case "M":
        moveTo(cur, [ox + next(), oy + next()]);
        cmd = rel ? "l" : "L";
        break;
      case "L":
        lineTo(cur, [ox + next(), oy + next()]);
        break;
      case "H":
        lineTo(cur, [ox + next(), cur.point[1]]);
        break;
      case "V":
        lineTo(cur, [cur.point[0], oy + next()]);
        break;
      case "C": {
        const c1: Point = [ox + next(), oy + next()];
        const c2: Point = [ox + next(), oy + next()];
        const end: Point = [ox + next(), oy + next()];
        cur.current?.segments.push([cur.point, c1, c2, end]);
        cur.point = end;
        break;
      }
      case "Z":
        if (cur.current) {
          cur.current.closed = true;
        }
        cur.point = cur.start;
        break;
      default:
        throw new Error(`unsupported path command "${cmd}"`);
    }
  }
  return cur.subpaths;
}

// Cubic approximation of a quarter circle; the same constant design tools use
// when they convert circles to paths.
const KAPPA = 0.552_284_749_8;

function ellipseSubpath(cx: number, cy: number, rx: number, ry: number) {
  const [kx, ky] = [KAPPA * rx, KAPPA * ry];
  const segments: Segment[] = [
    [
      [cx + rx, cy],
      [cx + rx, cy + ky],
      [cx + kx, cy + ry],
      [cx, cy + ry],
    ],
    [
      [cx, cy + ry],
      [cx - kx, cy + ry],
      [cx - rx, cy + ky],
      [cx - rx, cy],
    ],
    [
      [cx - rx, cy],
      [cx - rx, cy - ky],
      [cx - kx, cy - ry],
      [cx, cy - ry],
    ],
    [
      [cx, cy - ry],
      [cx + kx, cy - ry],
      [cx + rx, cy - ky],
      [cx + rx, cy],
    ],
  ];
  return { closed: true, segments };
}

const polyline = (points: Point[], closed: boolean): Subpath => ({
  closed,
  segments: points.slice(1).map((p, i) => [points[i], p]),
});

function rectSubpath(attrs: Record<string, string>): Subpath {
  const [x, y] = [Number(attrs.x ?? 0), Number(attrs.y ?? 0)];
  const [w, h] = [Number(attrs.width), Number(attrs.height)];
  const rx = Math.min(Number(attrs.rx ?? attrs.ry ?? 0), w / 2);
  const ry = Math.min(Number(attrs.ry ?? attrs.rx ?? 0), h / 2);
  if (!(rx && ry)) {
    return polyline(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ],
      true
    );
  }
  const [kx, ky] = [KAPPA * rx, KAPPA * ry];
  const corner = (from: Point, c1: Point, c2: Point, to: Point): Segment[] => [
    [from, c1, c2, to],
  ];
  const segments: Segment[] = [
    [
      [x + rx, y],
      [x + w - rx, y],
    ],
    ...corner(
      [x + w - rx, y],
      [x + w - rx + kx, y],
      [x + w, y + ry - ky],
      [x + w, y + ry]
    ),
    [
      [x + w, y + ry],
      [x + w, y + h - ry],
    ],
    ...corner(
      [x + w, y + h - ry],
      [x + w, y + h - ry + ky],
      [x + w - rx + kx, y + h],
      [x + w - rx, y + h]
    ),
    [
      [x + w - rx, y + h],
      [x + rx, y + h],
    ],
    ...corner(
      [x + rx, y + h],
      [x + rx - kx, y + h],
      [x, y + h - ry + ky],
      [x, y + h - ry]
    ),
    [
      [x, y + h - ry],
      [x, y + ry],
    ],
    ...corner([x, y + ry], [x, y + ry - ky], [x + rx - kx, y], [x + rx, y]),
  ];
  return { closed: true, segments };
}

const pointList = (s = ""): Point[] => {
  const n = numbers(s);
  return Array.from({ length: Math.floor(n.length / 2) }, (_, i) => [
    n[2 * i],
    n[2 * i + 1],
  ]);
};

/** Untransformed subpaths of one element, or null for a non-geometry tag. */
function rawSubpaths(
  tag: string,
  attrs: Record<string, string>
): Subpath[] | null {
  const n = (k: string) => Number(attrs[k] ?? 0);
  switch (tag) {
    case "path":
      return parsePathData(attrs.d ?? "");
    case "circle":
      return [ellipseSubpath(n("cx"), n("cy"), n("r"), n("r"))];
    case "ellipse":
      return [ellipseSubpath(n("cx"), n("cy"), n("rx"), n("ry"))];
    case "rect":
      return [rectSubpath(attrs)];
    case "line":
      return [
        polyline(
          [
            [n("x1"), n("y1")],
            [n("x2"), n("y2")],
          ],
          false
        ),
      ];
    case "polyline":
      return [polyline(pointList(attrs.points), false)];
    case "polygon": {
      const pts = pointList(attrs.points);
      return [polyline([...pts, pts[0]], true)];
    }
    default:
      return null;
  }
}

/**
 * Absolute subpaths drawn by one element, with its `transform` applied.
 * Returns null for tags that don't draw geometry.
 */
export function elementSubpaths(
  tag: string,
  attrs: Record<string, string | number>
): Subpath[] | null {
  const strAttrs = Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [k, String(v)])
  );
  const subpaths = rawSubpaths(tag, strAttrs);
  if (!(subpaths && strAttrs.transform)) {
    return subpaths;
  }
  const m = parseTransform(strAttrs.transform);
  return subpaths.map((s) => ({
    closed: s.closed,
    segments: s.segments.map((seg) => seg.map((p) => applyMatrix(m, p))),
  }));
}

// ── Serialization ────────────────────────────────────────────────────

/**
 * Six significant digits, as design tools write path data (so a converted
 * circle reads `15.4183`, like a circle the design tool flattened itself).
 */
const formatNumber = (v: number) =>
  Math.abs(v) < 1e-4 ? "0" : String(Number(v.toPrecision(6)));

/** Absolute path data for subpaths, using H/V for axis-aligned lines. */
function toPathData(subpaths: Subpath[]): string {
  const f = formatNumber;
  return subpaths
    .map(({ closed, segments }) => {
      const start = segments[0]?.[0];
      if (!start) {
        return "";
      }
      let d = `M${f(start[0])} ${f(start[1])}`;
      for (const seg of segments) {
        const [[x0, y0], ...rest] = seg;
        const [x, y] = rest.at(-1) as Point;
        if (seg.length === 4) {
          d += `C${rest.map(([px, py]) => `${f(px)} ${f(py)}`).join(" ")}`;
        } else if (f(y) === f(y0)) {
          d += `H${f(x)}`;
        } else if (f(x) === f(x0)) {
          d += `V${f(y)}`;
        } else {
          d += `L${f(x)} ${f(y)}`;
        }
      }
      return closed ? `${d}Z` : d;
    })
    .join("");
}

/**
 * Path data drawing the same stroke as a `<circle>`, `<rect>`, `<ellipse>`,
 * `<line>`, `<polyline>` or `<polygon>` (its `transform` applied), or null for
 * any other tag.
 */
export function shapeToPathData(
  tag: string,
  attrs: Record<string, string | number>
): string | null {
  if (tag === "path") {
    return null;
  }
  const subpaths = elementSubpaths(tag, attrs);
  return subpaths ? toPathData(subpaths) : null;
}

// ── Canonical keys (for comparing shapes) ────────────────────────────

const round2 = (v: number) => (Math.round(v * 100) / 100 + 0).toFixed(2);
const pointKey = ([x, y]: Point) => `${round2(x)},${round2(y)}`;
const samePoint = (a: Point, b: Point) => pointKey(a) === pointKey(b);
const reverse = (segs: Segment[]): Segment[] =>
  [...segs].reverse().map((seg) => [...seg].reverse());

function tangentAngle(seg: Segment, atEnd: boolean): number {
  const pts = atEnd ? [...seg].reverse() : seg;
  const from = pts[0];
  const to = pts.find((p) => !samePoint(p, from)) ?? pts.at(-1) ?? from;
  const [dx, dy] = atEnd
    ? [from[0] - to[0], from[1] - to[1]]
    : [to[0] - from[0], to[1] - from[1]];
  return Math.atan2(dy, dx);
}

const isCorner = (a: Segment, b: Segment) => {
  const turn = Math.abs(tangentAngle(a, true) - tangentAngle(b, false));
  return Math.min(turn, 2 * Math.PI - turn) > 0.02;
};

/** Merge consecutive collinear lines and drop zero-length lines. */
/** True for a cubic whose control points lie on the line between its ends. */
function isStraightCurve(seg: Segment): boolean {
  if (seg.length !== 4) {
    return false;
  }
  const [p0, , , p3] = seg;
  const len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
  if (len === 0) {
    return false;
  }
  return seg.slice(1, 3).every(([x, y]) => {
    const t =
      ((x - p0[0]) * (p3[0] - p0[0]) + (y - p0[1]) * (p3[1] - p0[1])) /
      len ** 2;
    const off =
      Math.abs((x - p0[0]) * (p3[1] - p0[1]) - (y - p0[1]) * (p3[0] - p0[0])) /
      len;
    return off < 0.005 && t > -0.001 && t < 1.001;
  });
}

function tidy({ closed, segments: raw }: Subpath): Segment[] {
  const out: Segment[] = [];
  // Exports sometimes write a straight line as a cubic; treat it as a line.
  const segments = raw.map((seg) =>
    isStraightCurve(seg) ? [seg[0], seg[3]] : seg
  );
  for (const seg of segments) {
    if (seg.length === 2 && samePoint(seg[0], seg[1])) {
      continue;
    }
    const prev = out.at(-1);
    if (prev?.length === 2 && seg.length === 2 && !isCorner(prev, seg)) {
      out[out.length - 1] = [prev[0], seg[1]];
      continue;
    }
    out.push(seg);
  }
  if (closed && out.length > 0) {
    const [first, last] = [out[0][0], out.at(-1)?.at(-1) as Point];
    if (!samePoint(first, last)) {
      out.push([last, first]);
    }
    // A closed shape that starts mid-edge splits that edge in two; rejoin it.
    const [head, tail] = [out[0], out.at(-1) as Segment];
    if (
      out.length > 2 &&
      head.length === 2 &&
      tail.length === 2 &&
      !isCorner(tail, head)
    ) {
      out.splice(0, 1);
      out[out.length - 1] = [tail[0], head[1]];
    }
  }
  return out;
}

const segmentsKey = (segs: Segment[]) =>
  segs.map((seg) => seg.map(pointKey).join(" ")).join(" | ");

export interface StrokeStyle {
  cap?: string;
  join?: string;
}

function hasCorner(segs: Segment[], closed: boolean): boolean {
  const pairs = segs.slice(1).map((seg, i) => [segs[i], seg]);
  if (closed && segs.length > 1) {
    pairs.push([segs.at(-1) as Segment, segs[0]]);
  }
  return pairs.some(([a, b]) => isCorner(a, b));
}

/**
 * The style that can actually affect how a subpath renders: caps only show on
 * open strokes, joins only at corners.
 */
function effectiveStyle(
  segs: Segment[],
  closed: boolean,
  style: StrokeStyle
): string {
  const cap = closed ? "" : (style.cap ?? "");
  const join = hasCorner(segs, closed) ? (style.join ?? "") : "";
  return cap || join ? `[${cap}/${join}] ` : "";
}

/**
 * Whether a path's line cap and line join can change how it renders: a cap
 * only shows where a stroke has open ends, a join only at corners. A circle
 * needs neither, so it can take any cap or join without changing.
 */
export function lineStyleRelevance(d: string): { cap: boolean; join: boolean } {
  const subpaths = parsePathData(d);
  return {
    cap: subpaths.some((s) => !s.closed),
    join: subpaths.some((s) => hasCorner(tidy(s), s.closed)),
  };
}

// Strokes shorter than this are "dots": a zero-length line made visible by a
// square or round cap. Exports write them as e.g. `16.99→17` or `17→17.0001`.
const DOT_LENGTH = 0.05;

function strokeLength(segs: Segment[]): number {
  return segs.reduce((sum, seg) => {
    const end = seg.at(-1) as Point;
    return sum + Math.hypot(seg[0][0] - end[0], seg[0][1] - end[1]);
  }, 0);
}

/**
 * The "dots" an element draws: open strokes shorter than `maxLength`, made
 * visible by a square or round cap.
 */
export function findDots(
  tag: string,
  attrs: Record<string, string | number>,
  maxLength: number
): { at: Point; length: number }[] {
  return (elementSubpaths(tag, attrs) ?? [])
    .filter((s) => !s.closed && s.segments.length > 0)
    .map((s) => ({ at: s.segments[0][0], length: strokeLength(s.segments) }))
    .filter((dot) => dot.length < maxLength);
}

/** Dots are keyed coarsely by their position and cap. */
function dotKey(subpath: Subpath, style: StrokeStyle): string | null {
  const at = subpath.segments[0]?.[0];
  if (!at || strokeLength(subpath.segments) >= DOT_LENGTH) {
    return null;
  }
  const r1 = (v: number) => (Math.round(v * 10) / 10 + 0).toFixed(1);
  return `${style.cap ? `[${style.cap}] ` : ""}dot ${r1(at[0])},${r1(at[1])}`;
}

/**
 * A key that is equal for two subpaths exactly when they draw the same stroke,
 * regardless of direction, start point (closed shapes), redundant points,
 * number formatting, or element type (a `<circle>` equals its path form).
 */
export function strokeKey(subpath: Subpath, style: StrokeStyle = {}): string {
  const dot = dotKey(subpath, style);
  if (dot) {
    return dot;
  }
  const segs = tidy(subpath);
  const prefix = `${subpath.closed ? "Z " : ""}${effectiveStyle(segs, subpath.closed, style)}`;
  const candidates: Segment[][] = [];
  for (const base of [segs, reverse(segs)]) {
    const starts = subpath.closed ? base.length : 1;
    for (let i = 0; i < starts; i++) {
      candidates.push([...base.slice(i), ...base.slice(0, i)]);
    }
  }
  return prefix + candidates.map(segmentsKey).sort()[0];
}

/** Collinear lines sharing a cap, as intervals along their common line. */
interface LineGroup {
  capPrefix: string;
  intervals: [number, number][];
  /** Unit normal; `offset` is the line's distance along it from the origin. */
  n: Point;
  offset: number;
  /** Unit direction, normalized so opposite directions share a group. */
  u: Point;
}

function addLine(
  groups: Map<string, LineGroup>,
  seg: Segment,
  capPrefix: string
) {
  const [[x0, y0], [x1, y1]] = seg;
  const len = Math.hypot(x1 - x0, y1 - y0);
  let u: Point = [(x1 - x0) / len, (y1 - y0) / len];
  if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && u[1] < 0)) {
    u = [-u[0], -u[1]];
  }
  const n: Point = [u[1], -u[0]];
  const offset = x0 * n[0] + y0 * n[1];
  const id = `${capPrefix}${round2(Math.atan2(u[1], u[0]) * 100)}|${round2(offset)}`;
  const group = groups.get(id) ?? { capPrefix, intervals: [], n, offset, u };
  const t = [x0 * u[0] + y0 * u[1], x1 * u[0] + y1 * u[1]];
  group.intervals.push([Math.min(...t), Math.max(...t)]);
  groups.set(id, group);
}

/** Keys for a group's lines, with touching or overlapping ones merged. */
function lineGroupKeys({ capPrefix, intervals, n, offset, u }: LineGroup) {
  const merged: [number, number][] = [];
  for (const [a, b] of intervals.sort((p, q) => p[0] - q[0])) {
    const last = merged.at(-1);
    if (last && a <= last[1] + 0.01) {
      last[1] = Math.max(last[1], b);
    } else {
      merged.push([a, b]);
    }
  }
  const at = (t: number): Point => [
    t * u[0] + offset * n[0],
    t * u[1] + offset * n[1],
  ];
  return merged.map(([a, b]) => {
    const [p, q] = [pointKey(at(a)), pointKey(at(b))];
    return capPrefix + (p < q ? `${p} ${q}` : `${q} ${p}`);
  });
}

/**
 * Direction-independent keys for every segment of a set of subpaths, so two
 * versions compare equal even when strokes are split or joined differently:
 * touching collinear lines are merged first (two half-lines of an X equal one
 * full line), and dots are keyed by position.
 */
export function segmentKeys(
  items: { style: StrokeStyle; subpath: Subpath }[]
): string[] {
  const keys: string[] = [];
  const lines = new Map<string, LineGroup>();
  for (const { subpath, style } of items) {
    const dot = dotKey(subpath, style);
    if (dot) {
      keys.push(dot);
      continue;
    }
    const cap = subpath.closed ? "" : (style.cap ?? "");
    const capPrefix = cap ? `[${cap}] ` : "";
    for (const seg of tidy(subpath)) {
      if (seg.length === 2) {
        addLine(lines, seg, capPrefix);
        continue;
      }
      const fwd = seg.map(pointKey).join(" ");
      const rev = [...seg].reverse().map(pointKey).join(" ");
      keys.push(capPrefix + (fwd < rev ? fwd : rev));
    }
  }
  for (const group of lines.values()) {
    keys.push(...lineGroupKeys(group));
  }
  return keys;
}

/**
 * How far apart two segments are: the largest distance between corresponding
 * points (end points and, for curves, control points), in either direction.
 */
export function segmentDistance(a: Segment, b: Segment): number {
  if (a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  const d = (p: Point, q: Point) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const fwd = Math.max(...a.map((p, i) => d(p, b[i])));
  const rev = Math.max(...a.map((p, i) => d(p, b.at(-1 - i) as Point)));
  return Math.min(fwd, rev);
}

/** Parse a segment key back into points (for distance estimates). */
export const segmentFromKey = (key: string): Segment =>
  key
    .replace(/^\[[^\]]*\] /, "")
    .replace(/^dot /, "")
    .split(" ")
    .map((p) => p.split(",").map(Number) as Point);
