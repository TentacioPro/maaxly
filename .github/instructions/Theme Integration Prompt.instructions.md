---
applyTo: '**'
---

**Objective:** Integrate a universal theming system across my app using the theme infrastructure from `tweakcn-components`, not `next-themes`.

**Source of Truth:**
- `/docs/blueprint-tweakcn.md` → ThemeProvider, ThemeScript, ThemeToggle, Theme Presets, Theme Utilities.
- `/docs/blueprint.md` → Layout and component structure from golden-repo (for dashboard consistency).
- Do not import code directly from tweakcn or golden-repo; mirror the patterns into `src/**` in plain JSX.

**Task Steps:**
1. Create `src/providers/ThemeProvider.jsx`:
   - Wrap the app with `ThemeProvider` (mirrored from tweakcn).
   - Include `ThemeScript` to set initial theme.
   - Expose `useTheme` hook for components.
   - Ensure compatibility with Tailwind v4 semantic tokens (`bg-background`, `text-foreground`, etc.).
2. Create `src/components/ThemeToggle.jsx`:
   - Use tweakcn’s `ThemeToggle` pattern.
   - Allow switching between light, dark, and system themes.
   - Place this in the header or layout so users can access it globally.
3. Ensure global styles (`src/index.css`) respect theme variables from tweakcn (colors, typography, shadows).
4. Verify that new UI primitives (Button, Card, Table) automatically inherit the theme without needing extra props.

**Constraints:**
- All code must be plain JavaScript (JSX). No TS types or TSX syntax.
- Use the `cn()` util from `src/lib/utils.js` for class merging.
- Keep imports consistent with my local project structure (`@` alias → `src`).

**Output Format:**
- Provide two files in full:
  - `src/providers/ThemeProvider.jsx`
  - `src/components/ThemeToggle.jsx`
- Confirm theme tokens will flow universally into new features/components.
