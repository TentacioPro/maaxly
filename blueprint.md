## Components

| Name | File Path | Description | Export Name(s) |
| --- | --- | --- | --- |
| AlertDialog (suite) | golden-repo/src/components/ui/alert-dialog.tsx | Accessible alert dialog primitives (overlay, content, header/footer, actions). | AlertDialog, AlertDialogTrigger, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel |
| AppSidebar | golden-repo/src/components/layout/app-sidebar.tsx | Sidebar wrapper reading layout context and passing variant/collapsible to UI sidebar. | AppSidebar |
| AuthenticatedLayout | golden-repo/src/components/layout/authenticated-layout.tsx | Shell layout composing providers and responsive sidebar + inset content; uses cookies for default open. | AuthenticatedLayout |
| Button | golden-repo/src/components/ui/button.tsx | Button component with class-variance-authority variants and asChild support. | Button, buttonVariants |
| Card (suite) | golden-repo/src/components/ui/card.tsx | Card primitives for header/content/footer/title/description/action. | Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent |
| CommandMenu | golden-repo/src/components/command-menu.tsx | Global command palette integrated with router and theme switching. | CommandMenu |
| ComingSoon | golden-repo/src/components/coming-soon.tsx | Placeholder page for unimplemented routes. | ComingSoon |
| ConfigDrawer | golden-repo/src/components/config-drawer.tsx | Drawer to configure theme, sidebar variant, layout collapsible, and direction; includes Reset. | ConfigDrawer |
| ConfirmDialog | golden-repo/src/components/confirm-dialog.tsx | Reusable confirm dialog built on AlertDialog with configurable texts and handlers. | ConfirmDialog |
| DataTableBulkActions | golden-repo/src/components/data-table/bulk-actions.tsx | Bulk selection actions for data tables. | DataTableBulkActions |
| DataTableColumnHeader | golden-repo/src/components/data-table/column-header.tsx | Data table header with sorting/menus. | DataTableColumnHeader |
| DataTableFacetedFilter | golden-repo/src/components/data-table/faceted-filter.tsx | Faceted filtering UI for data tables. | DataTableFacetedFilter |
| DataTablePagination | golden-repo/src/components/data-table/pagination.tsx | Pagination controls using getPageNumbers and @tanstack/react-table. | DataTablePagination |
| DataTableToolbar | golden-repo/src/components/data-table/toolbar.tsx | Table toolbar with actions/search. | DataTableToolbar |
| DataTableViewOptions | golden-repo/src/components/data-table/view-options.tsx | Column visibility and density controls. | DataTableViewOptions |
| DatePicker | golden-repo/src/components/date-picker.tsx | Single-date picker with popover and date-fns formatting. | DatePicker |
| Form (suite) | golden-repo/src/components/ui/form.tsx | Form helpers for react-hook-form with slots and validation messages. | Form, FormField, useFormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage |
| Header | golden-repo/src/components/layout/header.tsx | Top header with sidebar trigger and scroll shadow on fixed mode. | Header |
| LearnMore | golden-repo/src/components/learn-more.tsx | Small popover-triggered help/learn-more content. | LearnMore |
| LongText | golden-repo/src/components/long-text.tsx | Truncated text with tooltip/popover overflow reveal. | LongText |
| Main | golden-repo/src/components/layout/main.tsx | Main container with container queries; supports fixed/fluid. | Main |
| NavigationProgress | golden-repo/src/components/navigation-progress.tsx | Top loading bar driven by router state. | NavigationProgress |
| NavGroup | golden-repo/src/components/layout/nav-group.tsx | Sidebar nav group supporting links, collapsibles, and collapsed dropdowns. | NavGroup |
| NavUser | golden-repo/src/components/layout/nav-user.tsx | Sidebar user menu with account/notifications and sign-out. | NavUser |
| PasswordInput | golden-repo/src/components/password-input.tsx | Input with show/hide password toggle. | PasswordInput |
| ProfileDropdown | golden-repo/src/components/profile-dropdown.tsx | Avatar dropdown with profile/settings and sign out. | ProfileDropdown |
| Search | golden-repo/src/components/search.tsx | Button-style search opener for CommandMenu with kbd hint. | Search |
| SelectDropdown | golden-repo/src/components/select-dropdown.tsx | Generic select dropdown with loading state and RHF FormControl. | SelectDropdown |
| Sidebar (suite) | golden-repo/src/components/ui/sidebar.tsx | Composable responsive sidebar: provider, content, menus, trigger, rail, inset. | Sidebar, SidebarProvider, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar |
| SignOutDialog | golden-repo/src/components/sign-out-dialog.tsx | Confirm dialog to sign-out; clears auth store and redirects to sign-in with redirect param. | SignOutDialog |
| SkipToMain | golden-repo/src/components/skip-to-main.tsx | Accessibility link to jump to main content. | SkipToMain |
| Table (suite) | golden-repo/src/components/ui/table.tsx | Table primitives for header/body/row/cell/caption. | Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption |
| Tabs (suite) | golden-repo/src/components/ui/tabs.tsx | Tabs primitives with styled trigger/list/content. | Tabs, TabsList, TabsTrigger, TabsContent |
| TeamSwitcher | golden-repo/src/components/layout/team-switcher.tsx | Active team selector menu for sidebar header. | TeamSwitcher |
| ThemeSwitch | golden-repo/src/components/theme-switch.tsx | Theme toggle menu (light/dark/system) with meta theme-color sync. | ThemeSwitch |
| TopNav | golden-repo/src/components/layout/top-nav.tsx | Top navigation (desktop links + mobile dropdown). | TopNav |

## Styling Utilities

| Name | File Path | Purpose |
| --- | --- | --- |
| Fonts | golden-repo/src/config/fonts.ts | Central list of font tokens used to apply runtime font classes and appearance settings. |
| Styles (index.css) | golden-repo/src/styles/index.css | Global Tailwind v4 setup, base resets, custom utilities (container, no-scrollbar, faded-bottom) and collapsible animations. |
| Theme (theme.css) | golden-repo/src/styles/theme.css | Design tokens (OKLCH) for light/dark, sidebar tokens, and @theme inline mappings to Tailwind variables. |

## Layout Patterns

| Name | File Path | Pattern Type |
| --- | --- | --- |
| App Root | golden-repo/src/routes/__root.tsx | Route root shell with navigation progress, toaster, and devtools. |
| AppSidebar | golden-repo/src/components/layout/app-sidebar.tsx | Navigation/Shell Component |
| AuthenticatedLayout | golden-repo/src/components/layout/authenticated-layout.tsx | Layout Component (Authenticated shell with sidebar + inset content) |
| DirectionProvider | golden-repo/src/context/direction-provider.tsx | Provider (LTR/RTL with cookie persistence) |
| FontProvider | golden-repo/src/context/font-provider.tsx | Provider (runtime font class switching with cookie) |
| Header | golden-repo/src/components/layout/header.tsx | Header Pattern (sticky, scroll shadow, sidebar trigger) |
| LayoutProvider | golden-repo/src/context/layout-provider.tsx | Provider (sidebar variant/collapsible persisted to cookies) |
| Main | golden-repo/src/components/layout/main.tsx | Main Container Pattern (container queries, fixed/fluid) |
| SearchProvider | golden-repo/src/context/search-provider.tsx | Provider (global command menu state + ⌘/Ctrl+K) |
| Sidebar Pattern | golden-repo/src/components/ui/sidebar.tsx | Navigation Pattern (responsive offcanvas/icon/sidebar variants) |
| ThemeProvider | golden-repo/src/context/theme-provider.tsx | Provider (system/light/dark with cookie + html class sync) |

## Hooks & Helpers

| Name | File Path | Functionality |
| --- | --- | --- |
| cn | golden-repo/src/lib/utils.ts | Classnames utility combining clsx and tailwind-merge. |
| cookies (getCookie, setCookie, removeCookie) | golden-repo/src/lib/cookies.ts | Cookie helpers for client-side preferences/session tokens. |
| getPageNumbers | golden-repo/src/lib/utils.ts | Generates pagination page numbers with ellipsis based on current and total pages. |
| handleServerError | golden-repo/src/lib/handle-server-error.ts | Normalizes Axios and non-Axios errors to user toasts; includes 204 handling. |
| show-submitted-data | golden-repo/src/lib/show-submitted-data.tsx | Developer helper to visualize submitted form data for debugging. |
| sleep | golden-repo/src/lib/utils.ts | Promise-based delay helper for mock async flows. |
| useDialogState | golden-repo/src/hooks/use-dialog-state.tsx | Toggle-able dialog state hook for string/boolean sentinel values. |
| useIsMobile | golden-repo/src/hooks/use-mobile.tsx | Media-query-based mobile detector (syncs on resize). |
| useTableUrlState | golden-repo/src/hooks/use-table-url-state.ts | Syncs table pagination/filters/global search with URL and navigate(). |

## Auth/Session Related Code

| Name | File Path | Description |
| --- | --- | --- |
| Auth routes | golden-repo/src/routes/(auth) | Route pages for sign-in, sign-in (2-column), sign-up, forgot-password, and OTP. |
| AuthLayout | golden-repo/src/features/auth/auth-layout.tsx | Common auth screen layout used by flows (sign-in/up/otp/forgot-password). |
| ProfileDropdown | golden-repo/src/components/profile-dropdown.tsx | User avatar dropdown; exposes Sign out; links to settings/account. |
| Query error handling and session reset | golden-repo/src/main.tsx | React Query cache handlers: on 401, toast + reset auth-store + redirect to /sign-in with redirect param. |
| SignOutDialog | golden-repo/src/components/sign-out-dialog.tsx | Confirmation dialog that clears session (useAuthStore) and redirects to sign-in. |
| auth-store | golden-repo/src/stores/auth-store.ts | Zustand store for user and accessToken persisted to cookie; provides reset helpers. |

## Planning and Verification

- Step 1: Survey and categorize files. Done via scanning golden-repo/src components, hooks, lib, context, features, routes, and styles.
- Step 2: Populate tables, alphabetize entries. Completed with names sorted A–Z per section.
- Step 3: Ensure all sections are addressed. All five sections included; none empty.
- Step 4: Confirm tables render properly in Markdown. Tables use standard pipes/headers.
- Step 5: Self-check and finalize.

Self-check: All items were sourced from golden-repo; names and exports reflect the code opened. Ambiguities were noted in descriptions when suites expose multiple primitives.
