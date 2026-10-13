// Pure transforms for the animated codegen (`build-animated.ts`): checking an
// icon's animation file against its geometry, marking the geometry's parts for
// the runtime, and rendering the generated module.
import type { IconAnimations } from "../../animations/types";
import { presets } from "../../packages/react-animated/src/presets";
import { type IconNode, type IconNodeChild, toCamelAttrs } from "./build.lib";
import { kebabToPascal } from "./naming";

// Targets every icon has: the whole icon as one group, and each element.
const ICON_GROUP = "icon";
const EACH_PART = "*";

// Values the runtime animates on any element.
const TRANSFORMS = new Set([
  "x",
  "y",
  "rotate",
  "scale",
  "scaleX",
  "scaleY",
  "opacity",
]);
// Stroke drawing, on a shape only (it does nothing on a group).
const STROKE_DRAWING = new Set(["pathLength", "pathOffset"]);
// Geometry attributes, on the elements that have them.
const ATTRIBUTES: Record<string, string[]> = {
  d: ["path"],
  r: ["circle"],
  cx: ["circle"],
  cy: ["circle"],
};

/** A path's command structure: its commands, and how many numbers each has. */
export function pathSignature(d: string): string {
  return (d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [])
    .map((token) => (/^[a-zA-Z]$/.test(token) ? token : "n"))
    .join("");
}

const isPartIndex = (key: string) => /^\d+$/.test(key);

function checkGroups(
  groups: Record<string, readonly number[]>,
  partCount: number
): string[] {
  const errors: string[] = [];
  const owner = new Map<number, string>();
  for (const [name, members] of Object.entries(groups)) {
    if (name === ICON_GROUP || name === EACH_PART || isPartIndex(name)) {
      errors.push(`group "${name}": the name is reserved for a target`);
      continue;
    }
    if (members.length === 0) {
      errors.push(`group "${name}" is empty`);
    }
    for (const member of members) {
      if (!Number.isInteger(member) || member < 0 || member >= partCount) {
        errors.push(
          `group "${name}": element ${member} doesn't exist (the icon has ${partCount})`
        );
      } else if (owner.has(member)) {
        errors.push(
          `group "${name}": element ${member} is already in group "${owner.get(member)}"`
        );
      } else {
        owner.set(member, name);
      }
    }
  }
  return errors;
}

/** The elements a target covers, or null when the target doesn't exist. */
function targetParts(
  target: string,
  parts: IconNode,
  groups: Record<string, readonly number[]>
): { isGroup: boolean; parts: IconNodeChild[] } | null {
  if (target === ICON_GROUP) {
    return { isGroup: true, parts };
  }
  if (target === EACH_PART) {
    return { isGroup: false, parts };
  }
  if (isPartIndex(target)) {
    const part = parts[Number(target)];
    return part ? { isGroup: false, parts: [part] } : null;
  }
  const members = groups[target];
  return members
    ? {
        isGroup: true,
        parts: members
          .map((i) => parts[i])
          .filter((part): part is IconNodeChild => part !== undefined),
      }
    : null;
}

function checkValue(
  where: string,
  name: string,
  value: unknown,
  target: { isGroup: boolean; parts: IconNodeChild[] }
): string[] {
  if (TRANSFORMS.has(name)) {
    return [];
  }
  if (STROKE_DRAWING.has(name)) {
    return target.isGroup
      ? [
          `${where}: ${name} draws a stroke, so it needs an element, not a group`,
        ]
      : [];
  }
  const tags = ATTRIBUTES[name];
  if (!tags) {
    return [`${where}: "${name}" isn't a value the runtime animates`];
  }
  if (target.isGroup || target.parts.length !== 1) {
    return [`${where}: ${name} is per element, so it needs a single element`];
  }
  const [tag, attrs] = target.parts[0];
  if (!tags.includes(tag)) {
    return [`${where}: ${name} needs a <${tags.join(">/<")}>, not a <${tag}>`];
  }
  if (name !== "d") {
    return [];
  }
  const source = pathSignature(String(attrs.d));
  const frames = Array.isArray(value) ? value : [value];
  return frames.flatMap((frame, i) =>
    pathSignature(String(frame)) === source
      ? []
      : [
          `${where}: d keyframe ${i} ("${frame}") has a different command structure than the source path ("${attrs.d}"), so it can't morph`,
        ]
  );
}

/** The `default` pointer, and animation names that are reserved. */
function checkNames({
  animations,
  default: defaultName,
}: IconAnimations): string[] {
  const errors: string[] = [];
  if (
    defaultName !== undefined &&
    !(defaultName in animations || defaultName in presets)
  ) {
    errors.push(
      `default "${defaultName}" is neither one of its animations nor a preset (${Object.keys(presets).join(", ")})`
    );
  }
  for (const name of Object.keys(animations)) {
    if (name === "default") {
      errors.push(
        'an animation can\'t be named "default": name it for its motion and point `default` at it'
      );
    } else if (name in presets) {
      errors.push(
        `animation "${name}" has a preset's name: pick another, or point \`default\` at the preset`
      );
    }
  }
  return errors;
}

/** One animation's targets and values, against the icon's elements. */
function checkAnimation(
  name: string,
  animation: IconAnimations["animations"][string],
  parts: IconNode,
  groups: Record<string, readonly number[]>
): string[] {
  const targets = Object.entries(animation);
  if (targets.length === 0) {
    return [`animation "${name}" has no targets`];
  }
  const errors: string[] = [];
  for (const [key, part] of targets) {
    const where = `animation "${name}", target "${key}"`;
    const target = targetParts(key, parts, groups);
    if (!target) {
      errors.push(
        `${where}: no such element or group (elements are 0–${parts.length - 1})`
      );
      continue;
    }
    const values = Object.entries(part.animate);
    if (values.length === 0) {
      errors.push(`${where}: nothing to animate`);
    }
    const times = part.transition?.times;
    for (const [value, frames] of values) {
      errors.push(...checkValue(where, value, frames, target));
      if (times && (!Array.isArray(frames) || frames.length !== times.length)) {
        errors.push(
          `${where}: transition.times needs one entry per ${value} keyframe`
        );
      }
    }
  }
  return errors;
}

/**
 * Problems with an icon's animation file, checked against the icon's source
 * elements (unmerged, in source order). Empty when it's valid.
 */
export function checkAnimations(
  parts: IconNode,
  definition: IconAnimations
): string[] {
  const groups = definition.groups ?? {};
  return [
    ...checkGroups(groups, parts.length),
    ...checkNames(definition),
    ...Object.entries(definition.animations).flatMap(([name, animation]) =>
      checkAnimation(name, animation, parts, groups)
    ),
  ];
}

/**
 * The icon's elements marked for the runtime — `data-part` with each element's
 * source position, `data-group` on a `<g>` per group — all inside one
 * `<g data-group="icon">`, so animating the whole icon leaves the consumer's
 * own transforms on the `<svg>` alone. Attributes are camelCased (React).
 */
export function animatedIconNode(
  parts: IconNode,
  groups: Record<string, readonly number[]> = {}
): IconNode {
  const marked = toCamelAttrs(parts).map(
    ([tag, attrs, children], i): IconNodeChild =>
      children
        ? [tag, { ...attrs, "data-part": i }, children]
        : [tag, { ...attrs, "data-part": i }]
  );
  const groupOf = new Map<number, string>();
  for (const [name, members] of Object.entries(groups)) {
    for (const member of members) {
      groupOf.set(member, name);
    }
  }
  // Each group sits where its first element was. For a one-color icon the
  // paint order of its strokes doesn't show, so groups needn't be consecutive.
  const children: IconNode = [];
  const placed = new Set<string>();
  for (const [i, node] of marked.entries()) {
    const group = groupOf.get(i);
    if (group === undefined) {
      children.push(node);
    } else if (!placed.has(group)) {
      placed.add(group);
      const members = marked.filter((_, j) => groupOf.get(j) === group);
      children.push(["g", { "data-group": group }, members]);
    }
  }
  return [["g", { "data-group": ICON_GROUP }, children]];
}

export function renderAnimatedIconFile(
  name: string,
  iconNode: IconNode,
  animations: IconAnimations["animations"],
  defaultName?: string
): string {
  const componentName = kebabToPascal(name);
  const names = Object.keys(animations)
    .map((n) => JSON.stringify(n))
    .join(" | ");
  return `import createAnimatedJeddIcon from "../createAnimatedJeddIcon"
import type { Animations, IconNode } from "../types"

const __iconNode: IconNode = ${JSON.stringify(iconNode)}

const __animations: Animations = ${JSON.stringify(animations)}

const ${componentName} = createAnimatedJeddIcon${names ? `<${names}>` : ""}("${name}", __iconNode, __animations${defaultName ? `, ${JSON.stringify(defaultName)}` : ""})

export default ${componentName}
`;
}
