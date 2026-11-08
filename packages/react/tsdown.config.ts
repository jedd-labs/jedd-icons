import { defineConfig } from "tsdown";

export default defineConfig({
  // index + auto-discovered variant entries (e.g. src/rounded.ts), excluding the
  // internal top-level modules. unbundle preserves everything else (icons/*,
  // Icon.tsx, createJeddIcon.tsx) as their own modules regardless.
  // "use client" directives are preserved by default (oxc keeps top-level
  // directives), so rollup-preserve-directives is no longer needed.
  entry: ["src/*.ts", "!src/types.ts", "!src/_*.ts"],
  format: ["esm", "cjs"],
  dts: true,
  unbundle: true,
  deps: {
    // react is a peer dependency — never bundle it.
    neverBundle: ["react", "react/jsx-runtime"],
    // @jedd-icons/shared is an internal monorepo package — bundle it in so the
    // published package has no runtime dependency on it.
    alwaysBundle: ["@jedd-icons/shared"],
  },
});
