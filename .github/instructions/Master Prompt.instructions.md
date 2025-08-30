---
applyTo: '**'
---

**Objective:** Recreate [Target Component/Page, e.g., the Student Dashboard] in my project.

**Source of Truth:**
- `/docs/blueprint.md` → Components, layouts, hooks, and auth/session logic from **golden-repo**.  
- `/docs/blueprint-tweakcn.md` → Theme system, styling utilities, and UI components from **tweakcn-components**.  
- Always cross-reference both blueprints before generating new code.

**Key Reference File(s):**
- For layout/structure: `/_golden-repo/src/app/dashboard/page.tsx` and related components.  
- For theme consistency: `components/theme-provider.tsx`, `components/theme-toggle.tsx`, `utils/theme-*` utilities from tweakcn.  

**Language Constraint:**  
- Reference code may be TypeScript (TSX).  
- You MUST generate new code in **plain JavaScript (JSX)**.  
- Do not include TypeScript types, interfaces, or syntax.  

**Task Steps:**  
1. Open `/docs/blueprint.md` and `/docs/blueprint-tweakcn.md`. Identify the relevant components, layouts, hooks, and theme utilities.  
2. Recreate the requested target file (e.g., `src/pages/StudentDashboard.jsx`) using:  
   - **golden-repo** for dashboard structure (Cards, DataTable, Sidebar, AuthenticatedLayout).  
   - **tweakcn** for theme handling (ThemeProvider, ThemeScript, ThemeToggle, theme utils).  
3. Ensure the resulting file fully respects the theme system — colors, typography, shadows, and styling should automatically sync via tweakcn’s theming.  
4. Use the **classnames (`cn`) utilities** from the repos for style merging.  
5. Provide the final JSX code, with clean imports and consistent styling.  

**Output Format:**  
- Deliver the full JSX file content.  
- Imports must align with my local project structure.  
- Confirm theming integration is consistent (e.g., new components inherit tweakcn theme automatically).  
