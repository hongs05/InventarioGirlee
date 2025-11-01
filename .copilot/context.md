# 🧾 Project Context — Inventory & Combo Management (Next.js + Supabase)

## Overview

This project is a full-stack inventory and combo management system built with:

- Next.js 15 (App Router, Server Actions, TypeScript)
- Supabase (PostgreSQL + Storage + Auth)
- TailwindCSS for UI
- Zod + React Hook Form for validation
- Optional Edge Functions for background tasks

## Core Features

- 🛍️ Manage products: upload image, name, description, category, cost price, optional sell price.
- 💡 Auto-calculate sell price suggestions via `lib/pricing.ts`.
- 🧰 Build combos (bundled products) with packaging costs and margin-based price recommendations.
- 💾 Store images in Supabase Storage bucket `products/`.
- 🔒 Row-Level Security policies applied (owner-based CRUD).

## Important Libraries

- `@supabase/supabase-js` for client interactions.
- `slugify` for safe storage paths.
- `zod` + `react-hook-form` for strong form validation.
- `lucide-react` icons and Tailwind for UI.

## File Structure

/app
/inventory
/page.tsx -> Product list
/new/page.tsx -> Create product form
/[id]/page.tsx -> Edit product
/combos
/page.tsx -> Combo list
/new/page.tsx -> Create combo form
/[id]/page.tsx -> Edit combo
/lib
supabase-server.ts -> Supabase service-role client
supabase-browser.ts -> Public browser client
pricing.ts -> Price recommendation logic
/components
UploadImage.tsx
PriceTiers.tsx
ComboSummary.tsx

## Data Model (Supabase)

Tables:

- `products` → id, name, description, category_id, cost_price, sell_price, image_path, created_by
- `combos` → id, name, description, packaging_cost, suggested_price
- `combo_items` → combo_id, product_id, qty
- `categories`, `price_rules`

Storage: bucket `products` (public read).

## Goals for Copilot

Copilot should:

- Suggest new UI components and server actions consistent with these files.
- Respect Tailwind conventions.
- Prefer async Supabase calls via the server-side client.
- Use `recommendPrice()` for all price calculations.
- Keep forms accessible and typed.
