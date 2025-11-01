# Inventario Girlee

A modern Next.js boilerplate with Supabase authentication, built with TypeScript and Tailwind CSS.

## Features

- ⚡ **Next.js 16** - Latest App Router with Server Components and Server Actions
- 🔐 **Supabase Auth** - Complete authentication system with login, signup, and protected routes
- 🎨 **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- 📘 **TypeScript** - Type-safe development experience
- 🔒 **Middleware Protection** - Route protection with automatic redirects
- 🎯 **Server & Client Components** - Optimized rendering strategies

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service (Auth, Database, Storage)
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [ESLint](https://eslint.org/) - Code linting

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account (free tier available at [supabase.com](https://supabase.com))

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/hongs05/InventarioGirlee.git
cd InventarioGirlee
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Update the values in `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Why is the service role key required?**
>
> Server Actions that create or update productos/combinations use Supabase Storage and database mutations that bypass Row Level Security to ensure uploads succeed consistently. The service role key is only used on the server and never exposed to the browser. Treat it like any other secret and avoid committing it to source control.

You can find all three values in **Project Settings → API** within the Supabase dashboard. Rotate the key immediately if it is ever exposed.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/
│   ├── dashboard/          # Protected dashboard page
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── lib/
│   └── supabase/
│       ├── client.ts       # Supabase client for Client Components
│       └── server.ts       # Supabase client for Server Components
├── middleware.ts           # Auth middleware for route protection
├── .env.example            # Environment variables template
└── README.md
```

## Features Overview

### Authentication

- **Sign Up**: Create a new account with email/password
- **Sign In**: Login with existing credentials
- **Sign Out**: Logout functionality
- **Protected Routes**: Dashboard is only accessible when authenticated

### Middleware

The middleware automatically:

- Refreshes authentication tokens
- Redirects unauthenticated users from `/dashboard` to `/login`
- Redirects authenticated users from `/login` or `/signup` to `/dashboard`

### Supabase Clients

- **Client Component**: Use `createClient()` from `@/lib/supabase/client`
- **Server Component**: Use `createClient()` from `@/lib/supabase/server`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hongs05/InventarioGirlee)

Don't forget to add your environment variables in the Vercel dashboard.

### Environment Variables for Production

Make sure to set these environment variables in your deployment platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Learn More

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### Supabase

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
