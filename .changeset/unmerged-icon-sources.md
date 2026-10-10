---
"@jedd-icons/core": patch
"@jedd-icons/react": patch
---

Refine calendar-number (frame aligned with the other calendar icons) and cog (spoke positions). The square icon's node is now a `path` instead of a `rect`; it renders the same. Icon sources now keep each part as a separate path; the packages still ship one merged path per icon, so there's no visual change.
