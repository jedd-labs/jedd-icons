// Shared name transforms for the icon build pipeline.

/**
 * Convert a kebab-case icon name to a PascalCase component name
 * (e.g. `chevron-right` → `ChevronRight`).
 *
 * The result is emitted as a JS identifier (`const ChevronRight = …`), so a
 * name that would produce an identifier starting with a digit — e.g.
 * `3d-cube` → `3dCube` — is rejected here rather than generating a `.ts` file
 * that fails to compile. Rename the source icon to lead with a letter.
 */
export const kebabToPascal = (s: string) => {
  const pascal = s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  if (/^\d/.test(pascal)) {
    throw new Error(
      `Icon name "${s}" produces an invalid component name "${pascal}": a component name cannot start with a digit. Rename the icon to begin with a letter.`
    );
  }
  return pascal;
};
