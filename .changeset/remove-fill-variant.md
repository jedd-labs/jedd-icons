---
"@jedd-icons/react": minor
"@jedd-icons/core": minor
---

**Breaking:** the fill variant is removed. The `/fill` subpath export no longer exists in either package, and `createElement` in `@jedd-icons/core` no longer accepts a `variant` option. Only one icon ever had a fill version; import it from the package root instead.
