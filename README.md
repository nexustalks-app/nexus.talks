# Aasif Messenger

A modern real-time messaging application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Phase 1 - Foundation Complete ✓

This phase establishes the core foundation:
- ✅ Project setup with Next.js 15, TypeScript, Tailwind CSS
- ✅ Supabase client configuration (browser and server)
- ✅ Complete database schema with 8 tables
- ✅ Row Level Security policies
- ✅ Authentication system (login/signup/logout)
- ✅ Protected routes with middleware
- ✅ Basic application shell with responsive sidebar
- ✅ Type-safe database types

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase project (create one at [supabase.com](https://supabase.com))

### Installation

1. Install dependencies:
```bash
cd aasif-messenger
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under "API".

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (001 through 008):
   - `supabase/migrations/001_create_profiles.sql`
   - `supabase/migrations/002_create_conversations.sql`
   - `supabase/migrations/003_create_conversation_members.sql`
   - `supabase/migrations/004_create_messages.sql`
   - `supabase/migrations/005_create_message_reactions.sql`
   - `supabase/migrations/006_create_attachments.sql`
   - `supabase/migrations/007_create_blocked_users.sql`
   - `supabase/migrations/008_create_reports.sql`

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Architecture

### Database Schema

**Core Tables:**
- `profiles` - User profiles with presence status
- `conversations` - Conversation containers (direct/group)
- `conversation_members` - Junction table for user-conversation relationships
- `messages` - Message content

**Future Feature Tables:**
- `message_reactions` - Emoji reactions
- `attachments` - File attachments
- `blocked_users` - User blocking
- `reports` - Content reporting

### Security

- All tables protected by Row Level Security (RLS)
- Users can only access their own conversations and messages
- Authentication required for all protected routes
- Middleware validates sessions on every request

### Folder Structure

```
aasif-messenger/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (main)/          # Main application
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/            # Auth components
│   ├── layout/          # Layout components
│   └── ui/              # Reusable UI components
├── lib/
│   ├── supabase/        # Supabase clients
│   └── utils/           # Utility functions
├── supabase/
│   └── migrations/      # Database migrations
└── types/               # TypeScript types
```

## What's Next (Phase 2)

Phase 2 will implement:
- User profile management
- User search and discovery
- Conversation creation
- Real-time messaging
- Message history
- Read/unread state
- Online presence indicators

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **Realtime:** Supabase Realtime (Phase 2+)
- **Icons:** Lucide React

## License

Private project - All rights reserved
