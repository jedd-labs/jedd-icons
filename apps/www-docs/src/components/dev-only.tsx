import type { ReactNode } from "react";

/**
 * Renders its children under `pnpm dev` only, for content about the dev-only
 * docs (see `DEV_ONLY_FOLDERS` in `lib/source.ts`), e.g. a link to them from a
 * page the deployed site serves.
 */
export function DevOnly({ children }: { children: ReactNode }) {
  return import.meta.env.DEV ? children : null;
}
