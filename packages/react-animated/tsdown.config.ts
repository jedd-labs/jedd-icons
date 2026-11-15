import { defineConfig } from "tsdown";

export default defineConfig({
  // index + variant entries (e.g. src/rounded.ts); unbundle keeps every other
  // module (icons/*, Icon.tsx…) as its own file.
  entry: ["src/*.ts", "!src/types.ts", "!src/player.ts", "!src/useTrigger.ts"],
  format: ["esm", "cjs"],
  dts: true,
  unbundle: true,
  deps: {
    // Peer dependencies.
    neverBundle: ["react", "react/jsx-runtime", "motion"],
    // Internal package: bundled so this one depends on no other Jedd package.
    alwaysBundle: ["@jedd-icons/shared"],
  },
});
