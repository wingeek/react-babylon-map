---
name: demo.html reference implementation
description: The working Babylon.js + MapLibre integration demo at ./demo.html
type: reference
---

- **demo.html** at memory root — working MapLibre + Babylon.js shared GL context integration
- Uses Babylon 5.x CDN but patterns apply to 7.x
- Key: custom layer with `onAdd` creating Engine from `gl`, `render` calling `engine.wipeCaches(true)` + `scene.render(false)`
