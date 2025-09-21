---
applyTo: "src/components/**"
---

**Objective:** Wire the new messaging components into the application layout.  

**Tasks:**  
- Import `MessagingDock` into `MainLayout.jsx`.  
- Add a chat toggle button to `Header.jsx` (use `MessageSquare` from lucide-react).  
- On click, toggle the state `showMessagingDock` in `MainLayout`.  
- Render `<MessagingDock />` as a floating dock anchored bottom-right, responsive to screen width.  
- Ensure theme consistency → wrap with `ThemeProvider` context already in `MainLayout`.  
- Dock default: hidden; slide-in animation when opened.  

**Constraints:**  
- JSX only, React 19.  
- Tailwind for positioning (`fixed bottom-0 right-0 w-[25%] h-[85%] bg-background border-border shadow-lg`).  
- Use `cn()` for className merging.  
