import { unstable_noStore as noStore } from "next/cache";

import { slugify } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import type {
	StorefrontCategory,
	StorefrontCombo,
	StorefrontProduct,
} from "./types";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertSupabaseUrl(): string | null {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!url) {
		console.warn("[storefront] NEXT_PUBLIC_SUPABASE_URL is not set.");
		return null;
	}
	return url.replace(/\/$/, "");
}

function resolveStorageImageUrl(
	path: string | null | undefined,
	bucket = "products",
): string | null {
	if (!path) return null;
	const trimmed = path.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}
	if (trimmed.startsWith("data:")) {
		return trimmed;
	}
	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	const supabaseUrl = assertSupabaseUrl();
	if (!supabaseUrl) return null;
	return `${supabaseUrl}/storage/v1/object/public/${bucket}/${trimmed}`;
}

export function buildProductSlug(name: string, id: string) {
	const safeName = slugify(name, { maxLength: 60 });
	return `${safeName}-${id}`;
}

export function parseProductIdFromSlug(slug: string) {
	if (!slug) return null;
	const candidate = slug.split("-").pop();
	if (!candidate) {
		return UUID_REGEX.test(slug) ? slug : null;
	}
	return UUID_REGEX.test(candidate)
		? candidate
		: UUID_REGEX.test(slug)
		? slug
		: null;
}

type ProductRow = {
	id: string;
	name: string;
	description: string | null;
	sell_price: number | null;
	cost_price: number | null;
	currency: string | null;
	quantity: number | null;
	image_path: string | null;
	status: string | null;
	meta: Record<string, unknown> | null;
	categories: { id: number; name: string | null } | null;
};

type ComboRow = {
	id: string;
	name: string;
	description: string | null;
	suggested_price: number | null;
	packaging_cost: number | null;
	status: string | null;
	image_path: string | null;
};

type CategoryRow = {
	id: number;
	name: string;
	products: Array<{ count: number | null }> | null;
};

function mapProductRow(row: ProductRow): StorefrontProduct {
	const brand =
		row.meta && typeof row.meta === "object" && "brand" in row.meta
			? (row.meta.brand as string | null | undefined)
			: undefined;

	return {
		id: row.id,
		slug: buildProductSlug(row.name, row.id),
		name: row.name,
		brand: brand ?? undefined,
		currency: row.currency ?? "NIO",
		sellPrice: row.sell_price,
		costPrice: row.cost_price ?? undefined,
		quantity: row.quantity ?? undefined,
		imageUrl: resolveStorageImageUrl(row.image_path),
		description: row.description ?? undefined,
		category: row.categories?.name ?? undefined,
		categoryId: row.categories?.id ?? undefined,
		badges:
			row.status === "active"
				? undefined
				: [row.status ? row.status.toUpperCase() : "NO DISPONIBLE"],
	};
}

function mapComboRow(row: ComboRow): StorefrontCombo {
	return {
		id: row.id,
		slug: buildProductSlug(row.name, row.id),
		name: row.name,
		description: row.description ?? undefined,
		suggestedPrice: row.suggested_price ?? undefined,
		packagingCost: row.packaging_cost ?? undefined,
		status: row.status ?? undefined,
		imageUrl: resolveStorageImageUrl(row.image_path, "products"),
		badges:
			row.status === "active"
				? ["Combo"]
				: [row.status ? row.status.toUpperCase() : "Combo"],
	};
}

type ListProductsOptions = {
	limit?: number;
	categoryId?: number;
	search?: string;
	includeOutOfStock?: boolean;
	onlyAvailable?: boolean;
	minPrice?: number;
	maxPrice?: number;
	brands?: string[];
	tags?: string[];
};

export async function listActiveProducts(
	options: ListProductsOptions = {},
): Promise<StorefrontProduct[]> {
	noStore();
	const supabase = await createSupabaseServerClient();
	let query = supabase
		.from("products")
		.select(
			"id, name, description, sell_price, cost_price, currency, quantity, image_path, status, meta, categories(id, name)",
		)
		.eq("status", "active")
		.order("created_at", { ascending: false });

	if (options.limit) {
		query = query.limit(options.limit);
	}

	if (typeof options.categoryId === "number") {
		query = query.eq("category_id", options.categoryId);
	}

	if (options.search) {
		const searchTerm = `%${options.search}%`;
		query = query.or(
			[
				`name.ilike.${searchTerm}`,
				`description.ilike.${searchTerm}`,
				`meta->>brand.ilike.${searchTerm}`,
				`meta->>tags.ilike.${searchTerm}`,
			].join(","),
		);
	}

	if (typeof options.minPrice === "number") {
		query = query.gte("sell_price", options.minPrice);
	}

	if (typeof options.maxPrice === "number") {
		query = query.lte("sell_price", options.maxPrice);
	}

	if (options.brands && options.brands.length > 0) {
		query = query.in("meta->>brand", options.brands);
	}

	if (options.onlyAvailable) {
		query = query.gt("quantity", 0);
	} else if (!options.includeOutOfStock) {
		query = query.gt("quantity", 0);
	}

	const { data, error } = await query;

	if (error) {
		console.error("[storefront] listActiveProducts", error);
		return [];
	}

	return (data ?? []).map((row: ProductRow) => mapProductRow(row));
}

type ProductDetailResult = StorefrontProduct & {
	gallery?: string[];
	attributes?: Array<{ label: string; value: string }>;
};

export async function fetchProductDetail(
	slugOrId: string,
): Promise<ProductDetailResult | null> {
	noStore();
	const productId = parseProductIdFromSlug(slugOrId);
	if (!productId) {
		return null;
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("products")
		.select(
			"id, name, description, sell_price, cost_price, currency, quantity, image_path, status, meta, categories(id, name)",
		)
		.eq("id", productId)
		.eq("status", "active")
		.maybeSingle();

	if (error || !data) {
		if (error) {
			console.error("[storefront] fetchProductDetail", error);
		}
		return null;
	}

	const product = mapProductRow(data as ProductRow);
	const meta = (data as ProductRow).meta;

	const gallery = Array.isArray(meta?.gallery)
		? ((meta!.gallery as string[])
				.map((entry) => resolveStorageImageUrl(entry) ?? undefined)
				.filter(Boolean) as string[])
		: undefined;

	const attributes: Array<{ label: string; value: string }> = [];
	if (meta && typeof meta === "object") {
		const entries = Object.entries(meta);
		for (const [key, value] of entries) {
			if (key === "brand" || key === "gallery") continue;
			if (value === null || value === undefined) continue;
			const stringValue = String(value);
			if (!stringValue.trim()) continue;
			attributes.push({ label: key, value: stringValue });
		}
	}

	return {
		...product,
		gallery: gallery?.length ? gallery : undefined,
		attributes: attributes.length ? attributes : undefined,
	};
}

export async function listFeaturedProducts(limit = 6) {
	return listActiveProducts({ limit, includeOutOfStock: true });
}

type ComboListOptions = {
	limit?: number;
};

export async function listFeaturedCombos(
	options: ComboListOptions = {},
): Promise<StorefrontCombo[]> {
	noStore();
	const supabase = await createSupabaseServerClient();
	let query = supabase
		.from("combos")
		.select(
			"id, name, description, suggested_price, packaging_cost, status, image_path",
		)
		.eq("status", "active")
		.order("created_at", { ascending: false });

	if (options.limit) {
		query = query.limit(options.limit);
	}

	const { data, error } = await query;

	if (error) {
		console.error("[storefront] listFeaturedCombos", error);
		return [];
	}

	return (data ?? []).map((row: ComboRow) => mapComboRow(row));
}

export async function listCategoriesWithCounts(): Promise<
	StorefrontCategory[]
> {
	noStore();
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("categories")
		.select("id, name, products(count)")
		.order("name", { ascending: true });

	if (error) {
		console.error("[storefront] listCategoriesWithCounts", error);
		return [];
	}

	return (data ?? []).map((row: CategoryRow) => {
		const count = Array.isArray(row.products)
			? row.products.reduce<number>(
					(acc, product) => acc + (product.count ?? 0),
					0,
			  )
			: undefined;
		return {
			id: row.id,
			name: row.name,
			productCount: count,
		};
	});
}

type BrandRow = {
	meta: { brand?: string | null } | null;
};

export async function listActiveProductBrands(): Promise<string[]> {
	noStore();
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from<BrandRow>("products")
		.select("meta")
		.eq("status", "active")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("[storefront] listActiveProductBrands", error);
		return [];
	}

	const uniqueBrands = new Set<string>();
	for (const entry of data ?? []) {
		const brand = entry.meta?.brand;
		if (typeof brand === "string" && brand.trim()) {
			uniqueBrands.add(brand.trim());
		}
	}

	return Array.from(uniqueBrands).sort((a, b) =>
		a.localeCompare(b, "es", { sensitivity: "base" }),
	);
}
