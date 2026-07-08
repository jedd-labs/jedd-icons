// Shared name transforms for the icon build pipeline.
export const kebabToPascal = (s: string) =>
  s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
