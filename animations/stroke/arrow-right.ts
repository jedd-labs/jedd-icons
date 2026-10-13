import type { IconAnimations } from "../types";

// 0: shaft, 1: head.
export default {
  default: "nudge",
  animations: {
    nudge: {
      icon: {
        animate: { x: 3 },
        transition: { duration: 0.3, ease: "easeInOut" },
      },
    },
    "nudge-loop": {
      icon: {
        animate: { x: [0, 3, 0] },
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
    pointing: {
      0: {
        animate: { d: "M5 12H15" },
        transition: { duration: 0.3, ease: "easeInOut" },
      },
      1: {
        animate: { d: "M8 4.92893L15.0711 12L8 19.0711" },
        transition: { duration: 0.3, ease: "easeInOut" },
      },
    },
    // Leaves on the right and comes back in from the left.
    out: {
      icon: {
        animate: { x: [0, 24, -24, 0] },
        transition: {
          duration: 0.6,
          ease: "easeInOut",
          times: [0, 0.5, 0.5, 1],
        },
      },
    },
  },
} satisfies IconAnimations;
