# GroceryHopper

Your simple, smart grocery list manager built with Next.js 16 and Supabase.

## Features

- 📝 **Multiple Lists** - Create and manage multiple grocery lists
- ✅ **Check Off Items** - Mark items as purchased while shopping
- 🏷️ **Categories** - Organize items with custom categories, colors, and icons
- 🗑️ **Clear Checked** - Bulk delete checked items when you're done
- 📦 **Archive Lists** - Keep old lists archived without deleting them
- 🔐 **Authentication** - Secure sign up and sign in with Supabase Auth

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account and project
- Supabase CLI (optional, for migrations)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**

   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Get these from: [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API

3. **Initialize Supabase (if needed):**
   ```bash
   npx supabase login
   npx supabase init
   npx supabase link --project-ref your-project-ref
   ```

4. **Push database migrations:**
   ```bash
   npm run db:push
   ```

5. **Generate TypeScript types (optional):**
   ```bash
   npm run db:types
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run dev:turbo` - Start with Turbopack (experimental)
- `npm run dev:clean` - Clear cache and start fresh
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push migrations to Supabase
- `npm run db:types` - Generate TypeScript types

## Database Schema

### Tables

1. **profiles** - User profiles
2. **categories** - Shopping categories (Produce, Dairy, etc.)
3. **grocery_lists** - Shopping lists
4. **list_items** - Individual items in lists

All tables have Row Level Security (RLS) enabled.

## Project Structure

```
grocery-hopper/
├── app/
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main app dashboard
│   └── page.tsx           # Landing page
├── components/ui/         # shadcn/ui components
├── lib/supabase/          # Supabase clients
├── supabase/migrations/   # Database migrations
└── .env.local             # Environment variables
```

## Usage

1. Sign up at `/auth/signup`
2. Click "New List" to create a grocery list
3. Add items with optional quantities and categories
4. Check off items as you shop
5. Clear checked items when done

## Deployment

Deploy to Vercel:

1. Push code to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy!

Don't forget to push migrations to production:
```bash
npx supabase db push --linked
```

## License

MIT
