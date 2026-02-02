# AI Assistant Instructions

> **Rules and guidelines for AI assistants working on this project**

## General Rules

### DO ✅
- Read CONTEXT.md before making changes
- Follow existing code patterns and conventions
- Update documentation after making changes
- Use TypeScript with proper types
- Maintain the dark glass aesthetic in UI
- Test on localhost before suggesting deployment

### DON'T ❌
- Modify Firebase config without asking
- Change Firestore collection names
- Remove the admin email check (`yursccc@gmail.com`)
- Add new dependencies without justification
- Break the existing dark/glass aesthetic

## Protected Files
- `src/lib/firebase.ts` - Contains credentials
- `firestore.rules` - Security rules (ask before changing)
- `next.config.ts` - Build configuration

## Code Conventions

### Naming
- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserProfile`)
- **Hooks**: camelCase with `use` prefix (`useAuth`)

### Styling
- Use Tailwind CSS classes
- Dark theme: `bg-stone-950`, `text-white`
- Glass effect: `backdrop-blur-md bg-white/5 border border-white/10`
- Accent colors: `purple-*`, `green-*` for CTAs

### Component Patterns
```tsx
"use client"; // Required for client components

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export function ComponentName() {
    // State hooks first
    const [state, setState] = useState();
    
    // Effects next
    useEffect(() => {}, []);
    
    // Handlers
    const handleAction = () => {};
    
    // Render
    return <div>...</div>;
}
```

### Firebase Patterns
```tsx
// Always use try-catch for Firestore operations
try {
    const docRef = await addDoc(collection(db, "collection"), data);
} catch (error) {
    console.error("Error:", error);
}
```

## When Making Changes

1. **Before coding**: Check docs/02-features/ for relevant specs
2. **While coding**: Follow conventions above
3. **After coding**: 
   - Update docs/03-logs/implementation-log.md
   - Update CONTEXT.md if structure changed

## Project-Specific Instructions

### Authentication
- Always use `useAuth()` hook for user state
- Check `isAdmin` from context for admin features
- Admin email is hardcoded: `yursccc@gmail.com`

### Database Operations
- Products are public read, admin write only
- Users can only read/write their own documents
- Settings collection is public read for WhatsApp number

### UI Components
- Use `<GlassCard>` for card containers
- Use `<Navbar>` on every page
- Use Lucide icons (`lucide-react`)

### WhatsApp Integration
- Always fetch phone number from settings via `getWhatsAppNumber()`
- Use `generateWhatsAppLink()` for order links

---
*These rules help maintain consistency across AI-assisted development sessions.*
