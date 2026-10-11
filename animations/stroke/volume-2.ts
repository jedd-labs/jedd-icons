import type { IconAnimations } from "../types";

// 0: speaker, 1: outer wave, 2: inner wave. The outer wave holds back with
// `times` rather than a delay, so it's hidden from the start.
export default {
  animations: {
    default: {
      2: {
        animate: { opacity: [0, 1] },
        transition: { duration: 0.3, ease: "easeOut" },
      },
      1: {
        animate: { opacity: [0, 0, 1] },
        transition: { duration: 0.5, ease: "easeOut", times: [0, 0.4, 1] },
      },
    },
  },
} satisfies IconAnimations;
