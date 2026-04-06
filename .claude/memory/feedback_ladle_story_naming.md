---
name: Ladle story title naming
description: Ladle generates JS variable names from story titles — avoid leading numbers
type: feedback
---

Ladle generates JS variable names from story titles by joining them with `$`. A title like "3D Buildings" generates `const 3d$buildings$default` which is an invalid JS identifier (starts with a number).

**Why:** This caused a silent build failure where the story appeared in the sidebar but couldn't load. Renaming to "Buildings 3D" fixed it (generates `buildings$3d$default`).

**How to apply:** Always start Ladle story `title` strings with a letter, never a number. Use `export default { title: "Buildings 3D" }` not `{ title: "3D Buildings" }`.
