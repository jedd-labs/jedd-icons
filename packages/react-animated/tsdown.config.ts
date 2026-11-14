import { defineConfig } from "tsdown";

export default defineConfig({
  // index + auto-discovered variant entries (e.g. src/rounded.ts), excluding the
  // internal top-level modules. unbundle preserves everything else (icons/*,
  // Icon.tsx, createAnimatedJeddIcon.tsx…) as their own modules regardless.
  entry: ["src/*.ts", "!src/types.ts", "!src/player.ts", "!src/useTrigger.ts"],
  format: ["esm", "cjs"],
  dts: true,
  unbundle: true,
  deps: {
    // Peer dependencies — never bundle them.
    neverBundle: ["react", "react/jsx-runtime", "motion"],
    // @jedd-icons/shared is an internal monorepo package — bundle it in so the
    // published package depends on no other Jedd package.
    alwaysBundle: ["@jedd-icons/shared"],
  },
});
