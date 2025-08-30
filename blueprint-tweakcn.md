# tweakcn-components Blueprint

This document inventories reusable pieces in `tweakcn-components/`, grouped by category and alphabetized by Name. Include items in multiple sections if they span concerns.

## UI Components

| Name | Export(s) | Location | Purpose |
|---|---|---|---|
| Accordion | Accordion, AccordionItem, AccordionTrigger, AccordionContent | components/ui/accordion.tsx | Disclosure list with collapsible panels. |
| Alert | Alert, AlertTitle, AlertDescription | components/ui/alert.tsx | Inline status callout. |
| Alert Dialog | AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger | components/ui/alert-dialog.tsx | Confirmation modal for destructive actions. |
| Aspect Ratio | AspectRatio | components/ui/aspect-ratio.tsx | Maintain fixed aspect ratio for media. |
| Auth Dialog Wrapper | AuthDialogWrapper | components/auth-dialog-wrapper.tsx | Wraps children to prompt auth when required. |
| Avatar | Avatar, AvatarImage, AvatarFallback | components/ui/avatar.tsx | User avatar with fallback initials. |
| Badge | Badge, badgeVariants | components/ui/badge.tsx | Small status/label pill. |
| Breadcrumb | Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage | components/ui/breadcrumb.tsx | Navigation breadcrumbs. |
| Button | Button, buttonVariants | components/ui/button.tsx | Primary button component with variants. |
| Calendar | Calendar | components/ui/calendar.tsx | Date picker calendar. |
| Card | Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent | components/ui/card.tsx | Content grouping container. |
| Carousel | Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious | components/ui/carousel.tsx | Horizontal content carousel. |
| Chart | ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent | components/ui/chart.tsx | Chart primitives and tooltips. |
| Checkbox | Checkbox | components/ui/checkbox.tsx | Form checkbox control. |
| Collapsible | Collapsible, CollapsibleTrigger, CollapsibleContent | components/ui/collapsible.tsx | Show/hide content region. |
| Command | Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut | components/ui/command.tsx | Command palette primitives. |
| Context Menu | ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger, ContextMenuCheckboxItem, ContextMenuGroup, ContextMenuPortal, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger | components/ui/context-menu.tsx | Right-click contextual menu. |
| Copy Button | CopyButton | components/copy-button.tsx | Copies text to clipboard with feedback. |
| Dialog | Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose | components/ui/dialog.tsx | Modal dialog primitives. |
| Drawer | Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose | components/ui/drawer.tsx | Mobile-friendly sheet from screen edge. |
| Dropdown Menu | DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger | components/ui/dropdown-menu.tsx | Click-triggered menu. |
| Dynamic Font Loader | DynamicFontLoader | components/dynamic-font-loader.tsx | Loads Google/System fonts at runtime. |
| Figma Export Dialog | FigmaExportDialog | components/figma-export-dialog.tsx | Dialog to export theme to Figma. |
| Figma Header | FigmaHeader | components/figma-header.tsx | Marketing header variant for Figma page. |
| Footer | Footer | components/footer.tsx | Site footer. |
| Form | Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription | components/ui/form.tsx | Form wiring helpers. |
| Get Pro CTA | GetProCTA | components/get-pro-cta.tsx | Call-to-action card for Pro plan. |
| Get Pro Dialog Wrapper | GetProDialogWrapper | components/get-pro-dialog-wrapper.tsx | Gated dialog for Pro-only features. |
| Header | Header | components/header.tsx | Site header. |
| Horizontal Scroll Area | HorizontalScrollArea | components/horizontal-scroll-area.tsx | Drag-to-scroll horizontal container. |
| Hover Card | HoverCard, HoverCardTrigger, HoverCardContent | components/ui/hover-card.tsx | Hover-triggered info card. |
| Icons map | Icons | components/icons.tsx | Centralized SVG icon map. |
| Input | Input | components/ui/input.tsx | Text input field. |
| Input OTP | InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator | components/ui/input-otp.tsx | One-time-passcode input. |
| Label | Label | components/ui/label.tsx | Accessible form label. |
| Loading | Loading | components/loading.tsx | Spinner/loading indicator. |
| Menubar | Menubar, MenubarContent, MenubarItem, MenubarLabel, MenubarSeparator, MenubarTrigger, MenubarCheckboxItem, MenubarGroup, MenubarPortal, MenubarRadioGroup, MenubarRadioItem, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger | components/ui/menubar.tsx | Desktop-style menubar. |
| Navigation Menu | NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle | components/ui/navigation-menu.tsx | Top navigation menu. |
| Pagination | Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious | components/ui/pagination.tsx | Page nav controls. |
| Popover | Popover, PopoverTrigger, PopoverContent | components/ui/popover.tsx | Small overlay panel. |
| PostHog Init | PostHogInit | components/posthog-init.tsx | Initializes PostHog analytics on client. |
| Progress | Progress | components/ui/progress.tsx | Linear progress bar. |
| Radio Group | RadioGroup, RadioGroupItem | components/ui/radio-group.tsx | Radio input set. |
| Resizable | ResizablePanelGroup, ResizablePanel, ResizableHandle | components/ui/resizable.tsx | Resizable panels layout. |
| Scroll Area | ScrollArea, ScrollBar | components/ui/scroll-area.tsx | Custom scrollbars/areas. |
| Select | Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue, SelectGroup, SelectScrollDownButton, SelectScrollUpButton, SelectPortal | components/ui/select.tsx | Dropdown select control. |
| Separator | Separator | components/ui/separator.tsx | Horizontal/vertical divider. |
| Sheet | Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose | components/ui/sheet.tsx | Sliding panel overlay. |
| Sidebar | Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarInput, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, useSidebar | components/ui/sidebar.tsx | App shell sidebar system. |
| Skeleton | Skeleton | components/ui/skeleton.tsx | Loading skeleton block. |
| Slider | Slider | components/ui/slider.tsx | Range slider input. |
| Social Link | SocialLink | components/social-link.tsx | Styled anchor for social links. |
| Sonner Toaster | Toaster | components/ui/sonner.tsx | Sonner toaster mount. |
| Switch | Switch | components/ui/switch.tsx | Toggle switch input. |
| Table | Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow | components/ui/table.tsx | Data table primitives. |
| Tabs | Tabs, TabsList, TabsTrigger, TabsContent | components/ui/tabs.tsx | Tabbed interface. |
| Textarea | Textarea | components/ui/textarea.tsx | Multiline text input. |
| Theme Provider | ThemeProvider, useTheme | components/theme-provider.tsx | App theme context/provider and hook. |
| Theme Script | ThemeScript | components/theme-script.tsx | Injects inline script to set initial theme. |
| Theme Toggle | ThemeToggle | components/theme-toggle.tsx | Button to switch light/dark modes. |
| Theme View | default (ThemeView) | components/theme-view.tsx | Renders a theme preview block. |
| Toast | Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport | components/ui/toast.tsx | Toast primitives. |
| Toaster | Toaster | components/ui/toaster.tsx | Toast viewport mount. |
| Toggle | Toggle, toggleVariants | components/ui/toggle.tsx | Pressable toggle button. |
| Toggle Group | ToggleGroup, ToggleGroupItem | components/ui/toggle-group.tsx | Grouped toggles. |
| Tooltip | Tooltip, TooltipTrigger, TooltipContent, TooltipProvider | components/ui/tooltip.tsx | Hover/focus tooltip. |
| Tooltip Wrapper | TooltipWrapper | components/tooltip-wrapper.tsx | Convenience wrapper around Tooltip. |
| User Profile Dropdown | UserProfileDropdown | components/user-profile-dropdown.tsx | Account menu with profile/actions. |
| useToast (hook re-export) | useToast, toast | components/ui/use-toast.ts | Hook/utilities for toast. |

## Styling Utilities

| Name | Export(s) | Location | Purpose |
|---|---|---|---|
| Apply Style To Element | applyStyleToElement | utils/apply-style-to-element.ts | Set inline CSS variable/value on an element. |
| Apply Theme | applyThemeToElement | utils/apply-theme.ts | Apply light/dark theme style maps to DOM. |
| Color Converter | formatNumber, formatHsl, colorFormatter, convertToHSL | utils/color-converter.ts | Format and convert color values to HSL. |
| Contrast Checker | getContrastRatio | utils/contrast-checker.ts | Compute WCAG contrast ratio output. |
| Fonts (helpers) | FONT_CATEGORIES, FALLBACK_FONTS, buildFontFamily, extractFontFamily, getDefaultWeights, isFontLoaded, SYSTEM_FONTS, SYSTEM_FONTS_FALLBACKS | utils/fonts/index.ts | General font catalog and helpers. |
| Google Fonts | GOOGLE_FONTS_API_URL, buildFontCssUrl, loadGoogleFont | utils/fonts/google-fonts.ts | Generate CSS URL and load Google Fonts. |
| Shadows | getShadowMap, setShadowVariables | utils/shadows.ts | Generate and apply CSS shadow tokens. |
| Theme Fonts | fonts, sansSerifFonts, serifFonts, monoFonts, getAppliedThemeFont | utils/theme-fonts.ts | Theme-safe font mappings and helpers. |
| Theme Preset Helper | getPresetThemeStyles | utils/theme-preset-helper.ts | Get preset theme style maps by name. |
| Theme Presets | defaultPresets | utils/theme-presets.ts | Built-in theme preset definitions. |
| Theme Style Generator | generateThemeCode, generateTailwindConfigCode | utils/theme-style-generator.ts | Generate CSS and Tailwind config from theme styles. |
| Theme Styles | mergeThemeStylesWithDefaults | utils/theme-styles.ts | Merge provided styles with defaults. |

## Layout Patterns

| Name | Export(s) | Location | Purpose |
|---|---|---|---|
| AI Layout | default (AiLayout) | app/ai/layout.tsx | Route group layout for AI pages. |
| App Sidebar (example) | AppSidebar | components/examples/dashboard/components/app-sidebar.tsx | Sidebar composition pattern. |
| Dashboard Layout | default (DashboardLayout) | app/dashboard/layout.tsx | Authenticated dashboard shell. |
| Editor Layout | default (EditorLayout) | app/editor/theme/[[...themeId]]/layout.tsx | Editor route layout. |
| Figma Layout | default (FigmaLayout) | app/figma/layout.tsx | Marketing/landing layout variant. |
| Legal Layout | default (LegalLayout) | app/(legal)/layout.tsx | Legal pages layout wrapper. |
| Root Layout | metadata, viewport, default (RootLayout) | app/layout.tsx | Global app layout, providers, metadata. |
| Settings Layout | default (SettingsLayout) | app/settings/layout.tsx | Settings area layout with sidebar. |
| Success Layout | default (SuccessLayout) | app/success/layout.tsx | Post-checkout success shell. |
| Theme Layout | default (ThemeLayout) | app/themes/[themeId]/layout.tsx | Theme details layout. |

## Hooks & Helpers

| Name | Export(s) | Location | Purpose |
|---|---|---|---|
| AI Chat | useAIChat | hooks/use-ai-chat.tsx | Client hook to drive AI chat session. |
| AI Chat Form | useAIChatForm | hooks/use-ai-chat-form.ts | Form state and handlers for AI chat input. |
| AI Generate Theme | useAIGenerateTheme | hooks/use-ai-generate-theme.ts | High-level hook to generate theme via AI. |
| AI Theme Generation Core | useAIThemeGenerationCore | hooks/use-ai-theme-generation-core.ts | Core state machine/steps for AI theme gen. |
| Contrast Checker | useContrastChecker | hooks/use-contrast-checker.ts | Check contrast for color pairs. |
| Controls Tab From URL | DEFAULT_TAB, useControlsTabFromUrl | hooks/use-controls-tab-from-url.ts | Sync UI tab with URL query. |
| Copy To Clipboard | useCopyToClipboard | hooks/use-copy-to-clipboard.ts | Copy helper with success state. |
| Debounced Callback | useDebouncedCallback | hooks/use-debounced-callback.ts | Debounce any callback. |
| Dialog Actions | DialogActionsProvider, useDialogActions | hooks/use-dialog-actions.tsx | Context to control dialogs globally. |
| Document Drag & Drop Intent | useDocumentDragAndDropIntent | hooks/use-document-drag-and-drop-intent.ts | Detect global drag-over intent. |
| Font Search | useFontSearch | hooks/use-font-search.ts | Search and filter fonts. |
| Fullscreen | useFullscreen | hooks/use-fullscreen.ts | Toggle fullscreen for an element. |
| GitHub Stars | useGithubStars | hooks/use-github-stars.ts | Fetch GitHub star counts. |
| Guards | useGuards, useSessionGuard, useSubscriptionGuard | hooks/use-guards.ts | Auth/subscription access guards. |
| Image Upload | useImageUpload | hooks/use-image-upload.ts | Manage AI image uploads and validation. |
| Image Upload Reducer | imageUploadReducer, createSyncedImageUploadReducer | hooks/use-image-upload-reducer.ts | Reducers for image upload state. |
| Is Mobile | useIsMobile | hooks/use-mobile.tsx | Media-query based mobile detection. |
| Mounted | useMounted | hooks/use-mounted.tsx | Only true after first client render. |
| Post Login Action | usePostLoginAction | hooks/use-post-login-action.ts | Execute deferred action after auth. |
| Theme Inspector (core) | useThemeInspector | hooks/inspector/use-theme-inspector.ts | Inspect DOM for theme class usage. |
| Theme Inspector (re-export) | useThemeInspector | hooks/use-theme-inspector.ts | Re-export of inspector hook. |
| Theme Inspector Classnames | useClassNames | hooks/use-theme-inspector-classnames.ts | Extract class tokens from string. |
| Theme Inspector Mouse Events | useInspectorMouseEvents | hooks/inspector/use-inspector-mouse-events.ts | Bind hover/click handlers for inspector. |
| Theme Inspector Scroll | useInspectorScroll | hooks/inspector/use-inspector-scroll.ts | Track scroll state for inspector overlay. |
| Theme Inspector State | useInspectorState | hooks/inspector/use-inspector-state.ts | Local state store for inspector. |
| Theme Mutations | useCreateTheme, useUpdateTheme, useDeleteTheme | hooks/themes/use-theme-mutations.ts | CRUD mutations for themes. |
| Theme Preset From URL | useThemePresetFromUrl | hooks/use-theme-preset-from-url.ts | Read preset from URL for initial state. |
| Themes Data | themeKeys, useThemesData, useThemeData, usePrefetchThemes | hooks/themes/use-themes-data.ts | Fetch/cache themes list and details. |
| Toast (app-level) | useToast, toast | hooks/use-toast.ts | App-wide toast hook/utilities. |

## Miscellaneous Utilities

| Name | Export(s) | Location | Purpose |
|---|---|---|---|
| AI Image Upload | ALLOWED_IMAGE_TYPES, validateSvgContent, optimizeSvgContent | utils/ai/image-upload.ts | Validate and optimize uploaded images/SVG. |
| AI Prompt Builders | getTextContent, buildPromptForAPI, buildAIPromptRender, attachCurrentThemeMention, createCurrentThemePrompt, mentionsCurrentTheme, createPromptDataFromMentions, createPromptDataFromPreset, extractTextContentAndMentions, convertJSONContentToPromptData, convertPromptDataToJSONContent, isEmptyPromptData | utils/ai/ai-prompt.tsx | Build/parse prompt data structures. |
| AI Prompts | PROMPTS, CREATE_PROMPTS, REMIX_PROMPTS, VARIANT_PROMPTS | utils/ai/prompts.ts | Predefined AI prompt templates. |
| AI Theme Generate | SYSTEM_PROMPT, requestSchema, responseSchema | utils/ai/generate-theme.tsx | zod schemas and system prompt for AI theme. |
| Auth (client) | authClient | lib/auth-client.ts | Client helper to call auth API. |
| Auth (server-ish) | auth | lib/auth.ts | Auth utilities and helpers. |
| Checkout | openCheckout | lib/checkout.ts | Open Polar checkout link. |
| Classnames | cn, isDeepEqual | lib/utils.ts | Classname merge + deep equality. |
| Constants | AI_PROMPT_CHARACTER_LIMIT, DEBOUNCE_DELAY, AI_REQUEST_FREE_TIER_LIMIT, MAX_IMAGE_FILES, MAX_IMAGE_FILE_SIZE, MAX_SVG_FILE_SIZE, MAX_FREE_THEMES | lib/constants.ts | Shared constant values. |
| Debounce (plain) | debounce | utils/debounce.ts | Standard debounce utility. |
| Error Response | handleError | lib/error-response.ts | Standardized error → Response mapping. |
| Figma Constants | FIGMA_CONSTANTS, redirectToShadcraft | lib/figma-constants.ts | Figma-related constants and redirect. |
| Inspector (class utils) | getClassString | lib/inspector/class-utils.ts | Get class string from an Element. |
| Inspector (state utils) | areRectsEqual, areInspectorStatesEqual, createInspectorState, getEmptyInspectorState | lib/inspector/inspector-state-utils.ts | Pure helpers for overlay state. |
| Inspector (theme class finder) | findThemeClasses | lib/inspector/theme-class-finder.ts | Detect theme-related classes on node. |
| Parse CSS Input | variableNames, parseCssInput | utils/parse-css-input.ts | Parse user CSS vars into theme state. |
| Polar | polar | lib/polar.ts | Polar API client instance. |
| PostHog | initPostHog | lib/posthog.ts | Initialize PostHog analytics. |
| Query Provider | QueryProvider | lib/query-client.tsx | React Query provider wrapper. |
| Registry (colors) | TAILWIND_PALETTE, TAILWIND_SHADES | utils/registry/tailwind-colors.ts | Tailwind color references. |
| Registry (themes) | generateThemeRegistryFromPreset, generateThemeRegistryItemFromStyles | utils/registry/themes.ts | Helpers to build theme registry items. |
| Shared | logError | lib/shared.ts | Minimal logging helper. |
| Subscription (utils) | FREE_SUB_FEATURES, PRO_SUB_FEATURES | utils/subscription.ts | Feature lists by plan. |
| Theme AI Applier | applyGeneratedTheme | lib/ai/ai-theme-generator.ts | Apply AI-generated theme styles. |
| Utilities (format) | formatCompactNumber | utils/format.ts | Format numbers like 1.2k. |

If a category you expected is missing, it likely maps to “Layout Patterns” or “Miscellaneous Utilities” above.
