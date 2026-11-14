import type { IconAnimations } from "../types";

export default {
  default: "scan",
  animations: {
    scan: {
      icon: {
        animate: { x: [0, -1.5, 1.5, 0], y: [0, -1.5, -1.5, 0] },
        transition: { duration: 1, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
