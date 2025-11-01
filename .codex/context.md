# 🧱 Codex Context — Inventory & Combo Management App

## Stack

- Next.js 15 (App Router, TypeScript)
- Supabase as backend (Postgres + Storage + RLS)
- TailwindCSS
- Zod + React Hook Form for validation

## Functional Overview

1. **Inventory management**

   - Products have: name, description, cost_price, sell_price (optional), image, and category.
   - Users can upload product images → stored in Supabase Storage bucket `products`.
   - `lib/pricing.ts` computes price tiers (40%, 50%, 60%, 70%) and a suggested retail price.

2. **Combo builder**

   - Combos group multiple products + optional packaging cost (e.g., ₵120 for boxes).
   - Combo price = Σ(product.cost \* qty) + packagingCost → then apply margin tiers using pricing.ts.

3. **CRUD**

   - `/inventory` pages handle products.
   - `/combos` pages handle combos and combo_items.
   - Use Server Actions for insert/update/delete with `supabase-server.ts`.

4. **Pricing logic**
   - Implemented in `lib/pricing.ts`.
   - Rules:
     - Default margins: 40/50/60/70%.
     - Perfumería or cost ≥ 1200 = premium margin.
     - Low ticket (≤150) = 50% margin.
     - Suggested price rounded to “pretty” endings (9 or 0).
   - Example:
     ```ts
     const tiers = recommendPrice(800, { category: "Maquillaje" });
     // -> { m40: 1120, m50: 1200, m60: 1280, m70: 1360, suggested: 1280 }
     ```

## Coding Conventions

- Use modern React (hooks, client/server components).
- Keep files typed and clean.
- Use Tailwind classes, not inline styles.
- Prefer async/await + Supabase JS client.
- Return strongly typed objects, not raw responses.

## Example Tasks Codex Should Understand

- Add product CRUD UI.
- Build combo cost calculator.
- Generate `app/combos/new/page.tsx` with live total and suggested price.
- Add “recommended price tiers” sidebar to product form.
- Implement storage upload preview with `UploadImage.tsx`.

## Future Plans

- Integrate AI-based combo suggestions using OpenAI functions.
- Add analytics dashboard (Top-selling products, margin tracking).
- Export inventory as CSV.
