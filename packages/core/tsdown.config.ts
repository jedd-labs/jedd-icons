import { defineConfig } from "tsdown";

export default defineConfig({
  // index + auto-discovered variant entries (e.g. src/rounded.ts), excluding the
  // internal top-level modules. unbundle preserves everything else (icons/*,
  // createElement, createIcons) as their own modules regardless.
  entry: [
    "src/*.ts",
    "!src/createElement.ts",
    "!src/createIcons.ts",
    "!src/_*.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  unbundle: true,
  // @jedd-icons/shared is an internal monorepo package — bundle it in so the
  // published package has no runtime dependency on it.
  deps: { alwaysBundle: ["@jedd-icons/shared"] },
});
