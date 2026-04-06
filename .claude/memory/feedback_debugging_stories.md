---
name: Debugging Ladle stories — terminal first
description: Lessons from debugging Ladle/Vite story loading failures in WSL2
type: feedback
---

When a Ladle story shows blank/white, check the **terminal output of the dev server** first — it prints the actual error (e.g. `Failed to resolve import`). Don't waste time investigating browser-side errors, @fs paths, or Vite filesystem restrictions.

**Why:** Spent hours investigating Vite `@fs` 404s and WSL2 filesystem watcher issues, adding `server.fs.strict: false` and `server.fs.allow` overrides — when the real cause was a simple wrong import path (`"../story-map"` instead of `"./story-map"`). The terminal showed the error immediately on server startup.

**How to apply:**
- Story blank? → Check dev server terminal output first
- Terminal says "Failed to resolve import" → Fix the import path, don't chase @fs red herrings
- Only investigate Vite/Wsl2 filesystem issues if the terminal shows no errors and the file genuinely can't be served
