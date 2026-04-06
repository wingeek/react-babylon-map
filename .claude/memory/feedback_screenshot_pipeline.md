---
name: Screenshot pipeline for visual comparison
description: How to take screenshots of Ladle stories using puppeteer-core + Chrome in WSL2
type: reference
---

## Screenshot setup in WSL2

- `google-chrome-stable` is available at `/usr/bin/google-chrome-stable`
- `puppeteer-core` installed globally via `npm install -g puppeteer-core`
- Must use `NODE_PATH=$(npm root -g)` to resolve the global module
- WSL2 ports are accessible via `localhost` from within WSL (no need for WSL internal IP)

## Key patterns

```bash
NODE_PATH=$(npm root -g) node /tmp/screenshot.js
```

```js
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  headless: 'new',
});
// Use waitUntil: 'domcontentloaded' (not 'networkidle0') — avoids timeout with heavy apps
// Wait 10-15s after load for bloom/effects to fully render
```

## Timing for bloom/effects
- Three.js bloom takes 4-5 seconds to appear after initial render
- Babylon bloom appears faster
- Wait at least 10-15s total before screenshot for consistent results

## Ladle story URLs
- Format: `http://localhost:PORT/?story={slug}--default`
- Slug is derived from story title (lowercase, spaces→hyphens)
- Titles starting with numbers generate invalid JS variable names in Ladle — use "Buildings 3D" not "3D Buildings"
