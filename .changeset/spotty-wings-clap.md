---
"@jedd-icons/core": patch
"@jedd-icons/react": patch
---

Preserve non-default stroke-linecap on icon geometry. Previously any stroke-linecap override was stripped during SVG cleaning and codegen, which erased zero-length "dot" segments that depend on a square or round cap to render.
