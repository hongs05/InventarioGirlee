import { NextResponse } from "next/server";

import { listActiveProducts } from "@/lib/storefront/products";

function parseCategoryId(value: string | string[] | null): number | undefined {
	if (Array.isArray(value)) {
		return parseCategoryId(value[0]);
	}
	if (!value) return undefined;
	const normalized = Number.parseInt(value, 10);
	return Number.isFinite(normalized) ? normalized : undefined;
}

function parseNumber(value: string | null) {
	if (!value) return undefined;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const categoryId = parseCategoryId(searchParams.get("category"));
	const rawQuery = searchParams.get("q");
	const searchQuery =
		rawQuery && rawQuery.trim().length ? rawQuery.trim() : undefined;
	const minPrice = parseNumber(searchParams.get("minPrice"));
	const maxPrice = parseNumber(searchParams.get("maxPrice"));
	const brands = searchParams
		.getAll("brand")
		.map((brand) => brand.trim())
		.filter((value) => value.length);
	const onlyAvailable =
		searchParams.get("onlyAvailable") === "true" ||
		searchParams.get("onlyAvailable") === "1";

	const products = await listActiveProducts({
		search: searchQuery,
		categoryId,
		minPrice,
		maxPrice,
		brands: brands.length ? brands : undefined,
		includeOutOfStock: true,
		onlyAvailable,
	});

	return NextResponse.json({ products });
}
