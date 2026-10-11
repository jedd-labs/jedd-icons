import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // One output module per source file, so each icon tree-shakes on its own.
  unbundle: true,
  deps: {
    // Peer dependencies and @jedd-icons/react (whose Icon renders every
    // animated icon) are installed alongside — never bundle them.
    neverBundle: ["react", "react/jsx-runtime", "motion", "@jedd-icons/react"],
  },
});
