# Nexus.talks — UI Redesign Handoff Guide for Claude Code

> **Target Codebase Root:** `C:\Users\raist\Downloads\nexus mess\aasif-messenger`  
> **Framework:** Next.js 15.1.6 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 3.4.1 · Supabase SSR & Realtime  
> **Status:** Stable, security-hardened, and build-verified. Ready for visual redesign.

---

## 1. Quick Start: Files to Inspect First

Before modifying any styles or components, Claude Code should review these files in order:

1. **`tailwind.config.ts`**  
   Defines the theme extensions (current color palettes `cream`, `ink`, `amber`, `mauve`, custom animations, and box shadows).
2. **`app/globals.css`**  
   Contains the "Lamplight" CSS custom property design system (`:root` light and `@media (prefers-color-scheme: dark)` variables), utility classes (`.nx-stage`, `.nx-row`, `.nx-search`, `.nx-glass`), and keyframe animations.
3. **`app/(main)/layout.tsx` & `components/layout/sidebar.tsx`**  
   Defines the primary responsive shell: 72px icon-only rail on desktop (`md+`), bottom tab bar on mobile (`< md`).
4. **`components/conversation/conversations-shell.tsx` & `conversation-list.tsx`**  
   The persistent 2-pane conversation layout that keeps the conversation list and Supabase Realtime WebSocket mounted while switching chats.
5. **`components/conversation/conversation-view.tsx` & `message-list.tsx`**  
   The active chat thread container, message grouping, optimistic sending, and auto-scroll logic.

---

## 2. Project Architecture & Directory Structure

```
aasif-messenger/
├── app/                                # Next.js 15 App Router
│   ├── (auth)/                         # Unauthenticated routes (centered card layout)
│   │   ├── layout.tsx                  # Ambient background layout
│   │   ├── login/page.tsx              # /login route
│   │   └── signup/page.tsx             # /signup route
│   ├── (main)/                         # Protected routes (sidebar layout)
│   │   ├── layout.tsx                  # Server component layout with user authentication
│   │   ├── conversations/              # Conversation view
│   │   │   ├── layout.tsx              # Persistent 2-pane ConversationsShell wrapper
│   │   │   ├── page.tsx                # Empty state (when no conversation is selected)
│   │   │   └── [conversationId]/       # Dynamic chat route
│   │   │       ├── page.tsx            # Server Component: loads metadata + latest 50 messages
│   │   │       ├── loading.tsx         # Streaming skeleton loading state
│   │   │       └── error.tsx           # In-shell chat error recovery boundary
│   │   ├── people/page.tsx             # /people directory and discovery
│   │   └── profile/page.tsx            # /profile user profile view
│   ├── api/
│   │   ├── conversations/route.ts      # POST: creates or finds direct conversations
│   │   ├── guide/reply/route.ts        # Dormant Nexus Guide AI bot reply handler
│   │   └── healthcheck/route.ts        # GET: safe uptime and Supabase reachability probe
│   ├── error.tsx                       # Root-level Error Boundary with ChunkLoadError recovery
│   ├── globals.css                     # Design tokens, CSS variables, utility classes
│   ├── layout.tsx                      # Root HTML shell, fonts, and metadata
│   └── page.tsx                        # Public landing page (wordmark + auth CTAs)
├── components/
│   ├── auth/                           # Login and signup form components
│   ├── conversation/                   # Core messaging UI (list, thread, bubbles, composer)
│   ├── layout/                         # Sidebar navigation (desktop rail + mobile tab bar)
│   ├── profile/                        # Profile view, edit trigger, and modal preview
│   ├── ui/                             # Base primitives (Button, Input, Skeleton)
│   └── user/                           # User avatar, status pill, presence dot, user card
├── lib/
│   ├── supabase/                       # Supabase client (browser client & cookie-bound server client)
│   ├── utils/                          # cn (clsx + twMerge), format-date, profile-format
│   └── validations/                    # Zod schemas for conversation and bot payloads
├── supabase/migrations/                # PostgreSQL schema, RLS policies, triggers (001–012)
├── types/database.ts                   # Complete TypeScript schema definitions
├── middleware.ts                       # Next.js session validation and route redirection
└── tailwind.config.ts                  # Tailwind configuration
```

---

## 3. Existing Routes & Their Purpose

| Route | Type | Description |
| :--- | :--- | :--- |
| `/` | Public (Static) | Landing page with wordmark (`Nexus.talks`) and Sign In / Create Account buttons. |
| `/login` | Public (Static) | Email/password sign-in form with error guidance. |
| `/signup` | Public (Static) | Account creation form (display name, email, password). |
| `/conversations` | Protected (Dynamic) | Two-pane shell displaying the conversation list on the left and an empty placeholder on the right. |
| `/conversations/[id]` | Protected (Dynamic) | Active conversation view: Header, message thread, composer, and collapsible participant details panel (at `xl+`). |
| `/people` | Protected (Dynamic) | User discovery directory with search input and click-to-chat cards. |
| `/profile` | Protected (Dynamic) | Extended user profile view with bio, join date, status pill, and placeholder edit button. |
| `/api/healthcheck` | API (GET) | Lightweight probe returning `{ status: "ok", supabase: ... }`. |
| `/api/conversations` | API (POST) | Provisioning endpoint creating or fetching direct 1-on-1 conversations. |

---

## 4. UI Components & Style Files to Modify

When redesigning the visual appearance, Claude Code will need to work across these specific files:

### Foundation & Global Tokens
- `tailwind.config.ts`: Color palette definitions, border radii, shadows, font families, and custom animation keyframes.
- `app/globals.css`: Color variables (`:root` and `@media (prefers-color-scheme: dark)`), body background, scrollbars, and utility classes (`.nx-stage`, `.nx-row`, `.nx-search`, `.font-display`).
- `app/layout.tsx`: Root `<html>` and `<body>` tags, global font declarations, and page metadata.

### Shared Primitives (`components/ui/` & `components/user/`)
- `components/ui/button.tsx`: Primary, secondary, and ghost variants; size scales (`sm`, `md`, `lg`).
- `components/ui/input.tsx`: Form input styling, borders, focus rings, and placeholder tones.
- `components/ui/skeleton.tsx`: Pulsing loading placeholder shape and colors.
- `components/user/user-avatar.tsx`: Fallback initials avatar with color hashing or image render.
- `components/user/presence-indicator.tsx`: Online (green), away (amber), and offline indicator dot.
- `components/user/status-pill.tsx`: Rounded badge displaying text and presence status.

### Authentication & Landing Screens
- `app/page.tsx`: Landing page layout, ambient background graphics, typography, and CTA buttons.
- `app/(auth)/layout.tsx`: Centered auth wrapper and background glow elements.
- `components/auth/login-form.tsx`: Login card, labels, input fields, error alert banner, and submit button.
- `components/auth/signup-form.tsx`: Registration card, input fields, password hints, and submit button.

### Primary Navigation & App Shell
- `app/(main)/layout.tsx`: Main layout wrapper managing viewport height (`100dvh`), background tone, and sidebar layout.
- `components/layout/sidebar.tsx`:
  - **Desktop Rail (`md+`):** 72px left rail, brand logo icon (`N.`), navigation icons, active indicator bars, user avatar, and sign-out button.
  - **Mobile Tab Bar (`< md`):** Bottom navigation bar with icons and text labels.

### Conversation List & Sidebar (`components/conversation/`)
- `components/conversation/conversations-shell.tsx`: Flex container defining left list width (`w-[var(--list-width)]`) and center chat pane.
- `components/conversation/conversation-list.tsx`: Header ("Messages"), conversation counter, search bar (`Search` icon, clear button), conversation item list, empty states, and loading skeletons.
- `components/conversation/conversation-item.tsx`: Individual conversation list row, active highlight marker, avatar, display name, timestamp, message preview snippet, and unread count badge.
- `components/conversation/empty-conversation.tsx`: Illustrated placeholder card shown when no conversation is selected.

### Active Chat View (`components/conversation/`)
- `components/conversation/conversation-view.tsx`: Stage wrapper rendering header, message list, and participant sidebar.
- `components/conversation/conversation-header.tsx`: Header bar with participant avatar, live presence dot, display name, `@username` / online label, mobile back button (`ArrowLeft`), and details toggle button (`PanelRight`).
- `components/conversation/message-list.tsx`: Scrollable message container, date dividers ("Today", "Yesterday", weekday), and skeleton loading state.
- `components/conversation/message-item.tsx`:
  - **Message Bubbles:** Own message vs other message background colors, borders, drop shadows, and text colors.
  - **Joined Corners:** Dynamic corner radii (`ownRadius` and `otherRadius`) connecting consecutive messages from the same sender into visual blocks.
  - **Timestamp:** Formatted time label at the bottom right of bubbles.
- `components/conversation/message-input.tsx`: Floating message composer, auto-resizing `<textarea>`, send button with icon transition, and keyboard helper text ("Enter to send · Shift+Enter for a new line").
- `components/conversation/participant-panel.tsx`: Collapsible desktop sidebar (`xl+`) with radial gradient background, large avatar, display name, username, status pill, bio block, and metadata ("Member since", "Last seen").

### User Discovery & Profile Views
- `components/user/people-list.tsx`: Header ("People"), search input, loading skeleton grid, and empty search results state.
- `components/user/user-card.tsx`: Clickable card for each user in the directory, hover glow, avatar, presence, display name, username, bio snippet, and "Online" badge.
- `components/profile/profile-view.tsx`: Full profile presentation, ambient backdrop glow, avatar, name, username, status pill, "About" card, metadata definition list, and "Edit profile" button.
- `components/profile/profile-modal.tsx`: Modal dialog previewing a profile with backdrop blur and smooth entrance/exit transitions.

### Loading & Error States
- `app/(main)/conversations/[conversationId]/loading.tsx`: Streaming skeleton mimicking header and chat bubbles.
- `app/(main)/conversations/[conversationId]/error.tsx`: In-shell error card with "Reload Page", "Try Again", and "Back to Conversations".
- `app/error.tsx`: Global error boundary card.

---

## 5. Critical Functionality That MUST Be Preserved

When updating markup and Tailwind classes, Claude Code **must not break** the following operational logic:

1. **Authentication & Session Forwarding:**
   - In `middleware.ts` and `app/(main)/layout.tsx`, sessions are validated with `supabase.auth.getUser()`. Do not bypass or remove server client authentication checks.
2. **Realtime WebSocket Channels:**
   - In `components/conversation/message-list.tsx` and `components/conversation/conversation-list.tsx`, the client initializes Realtime channels and calls `client.realtime.setAuth(session.access_token)`.
   - **Do not remove `setAuth`**; without it, Supabase Realtime drops events under Row Level Security.
3. **Message Deduplication & Ordering:**
   - `initialMessages` in `app/(main)/conversations/[conversationId]/page.tsx` are queried descending (`order('created_at', { ascending: false })`) and reversed in-memory (`.slice().reverse()`) to ensure the latest 50 messages render chronologically.
   - Incoming Realtime messages in `message-list.tsx` are deduplicated via `prev.some(m => m.id === incoming.id)` and appended to the bottom. Preserve this deduplication logic.
4. **Composer Keybindings:**
   - In `components/conversation/message-input.tsx`, `onKeyDown` sends on `Enter` (without `Shift`) and inserts a line break on `Shift+Enter`. Preserve this event handler.
5. **Auto-Scrolling:**
   - `scrollRef` in `components/conversation/message-list.tsx` tracks `messages` state and scrolls to `el.scrollTop = el.scrollHeight`. Keep the container ref attached to the scrollable div.
6. **Error Boundary Safe Throttling:**
   - Both `app/error.tsx` and `app/(main)/conversations/[conversationId]/error.tsx` include a 15-second `sessionStorage` cooldown to prevent infinite reload loops during `ChunkLoadError`. Keep this logic intact.
7. **Form Submission Handlers:**
   - Do not replace form submission logic in `login-form.tsx` and `signup-form.tsx` with standard HTML form actions; they use client-side Supabase authentication and router redirects.

---

## 6. Recommended Implementation Order for Claude Code

To execute the redesign with minimal friction and immediate visual feedback, follow this phased sequence:

```
[Phase A: Foundations]
  1. Update tailwind.config.ts (new color palettes, typography, shadows, radii).
  2. Update app/globals.css (:root and dark mode CSS variables, background tones, global focus rings).
  3. Update components/ui/ (Button, Input, Skeleton).

[Phase B: Authentication & Onboarding]
  4. Redesign app/page.tsx (Landing screen).
  5. Redesign app/(auth)/layout.tsx, components/auth/login-form.tsx, and components/auth/signup-form.tsx.

[Phase C: Navigation Shell]
  6. Redesign app/(main)/layout.tsx and components/layout/sidebar.tsx (desktop rail and mobile tab bar).
  7. Update components/user/user-avatar.tsx, presence-indicator.tsx, and status-pill.tsx.

[Phase D: Conversation List & Directory]
  8. Redesign components/conversation/conversations-shell.tsx.
  9. Redesign components/conversation/conversation-list.tsx and conversation-item.tsx.
  10. Redesign components/user/people-list.tsx and user-card.tsx.

[Phase E: Active Chat Thread]
  11. Redesign components/conversation/conversation-header.tsx.
  12. Redesign components/conversation/message-item.tsx (bubble shapes, colors, and timestamps).
  13. Redesign components/conversation/message-input.tsx (floating composer, send button).
  14. Redesign components/conversation/participant-panel.tsx (right-side drawer).
  15. Redesign components/conversation/empty-conversation.tsx.

[Phase F: Profile & Polish]
  16. Redesign components/profile/profile-view.tsx and profile-modal.tsx.
  17. Match skeletons in loading.tsx and error cards in error.tsx.
```

---

## 7. Developer Toolchain & Verification Commands

All commands must be run from the application root: `C:\Users\raist\Downloads\nexus mess\aasif-messenger`.

> [!NOTE]
> On Windows PowerShell, executing `npm` directly may encounter execution policy restrictions on `npm.ps1`. Run commands via `cmd.exe /c "..."` or use `npm.cmd`.

### Install Dependencies
```cmd
cmd.exe /c "npm install"
```

### Start Development Server
```cmd
cmd.exe /c "npm run dev"
```
The application will be available at `http://localhost:3000`.

### Type Check (TypeScript strict verification)
```cmd
cmd.exe /c "npm run typecheck"
```
*Expected output: `tsc --noEmit` exits with code 0 (zero errors).*

### Lint Check (ESLint 9)
```cmd
cmd.exe /c "npm run lint"
```
*Expected output: `✔ No ESLint warnings or errors`.*

### Production Build Test
```cmd
cmd.exe /c "npm run build"
```
*Expected output: Compiles all routes, validates types, and generates static/dynamic pages with code 0.*
