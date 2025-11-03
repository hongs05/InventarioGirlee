# Old Inventory Migration Guide

This folder holds a small toolchain to convert an existing Excel workbook into data that the Supabase `public.products` table accepts.

## 1. Prepare the spreadsheet

1. Export your legacy inventory as an **.xls** or **.xlsx** file.
2. Make sure the first worksheet has a header row with columns similar to:
   - `SKU` _(required)_
   - `Name` _(required)_
   - `Description`
   - `Category`
   - `Cost`
   - `Price`
   - `Currency`
   - `Status`
3. Copy the file into this directory (for example `inventorymig/old_inventory.xlsx`). The converter reads the first sheet only.

> **Assumption**: if the sheet uses different header labels, the script attempts to guess them via keyword matching (e.g. `codigo`, `precio_venta`, `familia`, etc.). You can tweak `COLUMN_ALIASES` inside the script if you have bespoke column names.

## 2. (Optional) Normalize category labels

If your original file uses category names that differ from the categories already present in the database, create a mapping file:

```bash
cp inventorymig/category-map.example.json inventorymig/category-map.json
```

Edit `category-map.json` so that:

- `defaultCategory` is the name you want to assign when a row has no category.
- `map` translates legacy category strings to the names that exist (or that you plan to create) in Supabase.

Example:

```json
{
	"defaultCategory": "Maquillaje",
	"map": {
		"Makeup": "Maquillaje",
		"Skin Care": "Cuidado de la Piel"
	}
}
```

## 3. Run the converter

Inside the repository root:

```bash
node inventorymig/import-inventory.cjs --file=inventorymig/old_inventory.xlsx --category-map=inventorymig/category-map.json
```

Optional flags:

| Flag             | Meaning                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| `--out-dir=...`  | Where to write outputs (defaults to `inventorymig/output/`).                 |
| `--currency=USD` | Override the default currency (`NIO`) when the sheet has no currency column. |

Running the script produces two artifacts under `inventorymig/output/`:

1. `products.csv` – ready to import through the Supabase Table Editor or the CSV import wizard.
2. `products.sql` – bulk `INSERT ... ON CONFLICT DO UPDATE` statements you can feed to Supabase via `supabase db remote commit` / `psql`.

Each product uses **"Precio a Jeffrey"** as the base `cost_price`. The tool automatically applies a 70% earnings margin (sell price = cost × 1.7) and adds any missing categories to `public.categories`.

It also prints a list of categories encountered so you can double-check that every category exists.

## 4. Load the data into Supabase

### Option A. CSV import (UI)

1. Open Supabase → Table Editor → `public.products`.
2. Use **Import Data → CSV** and upload `inventorymig/output/products.csv`.
3. Map the CSV columns to the table fields (SKU → `sku`, etc.) and confirm.

### Option B. SQL import (CLI)

```bash
supabase db remote commit inventorymig/output/products.sql
```

or, for a one-off execution:

```bash
supabase db remote exec < inventorymig/output/products.sql
```

Either path is idempotent: existing SKUs are updated, new SKUs are inserted.

## 5. After import

- Verify a handful of products in the dashboard and POS.
- If you created new categories, ensure they are `status = 'active'` so the POS can see them.
- Commit or archive the output files once the migration is done.
