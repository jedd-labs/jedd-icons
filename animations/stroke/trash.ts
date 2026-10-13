import type { IconAnimations } from "../types";

// 0: lid, 1: bin, 2: handle.
export default {
  default: "lift",
  groups: { lid: [0, 2] },
  animations: {
    lift: {
      lid: {
        animate: { y: -1.5, rotate: -10 },
        origin: "0% 100%",
        transition: { duration: 0.25, ease: "easeOut" },
      },
    },
  },
} satisfies IconAnimations;
