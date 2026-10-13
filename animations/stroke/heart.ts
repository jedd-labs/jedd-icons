import type { IconAnimations } from "../types";

export default {
  default: "beat",
  animations: {
    beat: {
      icon: {
        animate: { scale: [1, 1.2, 0.95, 1.08, 1] },
        transition: { duration: 0.8, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
