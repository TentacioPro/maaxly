
**Objective:** Refactor the `Header` component to include a sidebar with menu options. The sidebar should support personalization features, especially theme configuration, using tweakcn’s theming system.

**Source of Truth:**
- `/docs/blueprint.md` → For Sidebar patterns and layout (e.g., Sidebar suite, NavGroup, NavUser, ConfigDrawer).
- `/docs/blueprint-tweakcn.md` → For theme configuration (ThemeProvider, ThemeToggle, Theme Presets, Theme Style utilities).

**Task Steps:**
1. Refactor `src/components/Header.jsx`:
   - Add a sidebar trigger (hamburger/menu button).
   - Integrate sidebar layout using the `Sidebar` and related primitives from golden-repo blueprint.
2. Inside the sidebar, add a **Personalization** menu section:
   - Implement a config panel (like golden-repo’s `ConfigDrawer`) but backed by tweakcn’s theme system.
   - Users can adjust theme settings (light/dark/system, fonts, colors).
   - Preview changes should reflect immediately across the app.
   - On apply/save, persist the selection as the active app theme.
3. Update the existing theme toggle button:
   - Replace its internals with tweakcn’s `ThemeToggle` pattern.
   - Ensure it syncs with the sidebar config panel.
   - Verify toggling light/dark here reflects globally and matches preview panel changes.
4. Ensure the overall UX:
   - Sidebar slides in from the left.
   - Personalization menu items are grouped clearly.
   - Theme changes update instantly via `ThemeProvider`.

**Constraints:**
- All code must be plain JavaScript (JSX), no TypeScript syntax.
- Use `cn()` from `src/lib/utils.js` for merging Tailwind classes.
- Keep imports consistent with my local `src/**` project structure.

**Output Format:**
- Provide the refactored `src/components/Header.jsx` file in full.
- If needed, also provide new supporting files (e.g., `src/components/Sidebar.jsx`, `src/components/PersonalizationPanel.jsx`).
- Confirm theme integration is universal: preview + toggle + applied theme should all stay consistent.
