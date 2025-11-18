import { SiteShell } from "@/components/storefront/site-shell";
import { ProductsPageClient } from "@/components/storefront/products-page-client";
import {
	listActiveProductBrands,
	listActiveProducts,
	listCategoriesWithCounts,
} from "@/lib/storefront/products";

function parseCategoryId(value: string | string[] | undefined) {
	if (Array.isArray(value)) {
		return parseCategoryId(value[0]);
	}
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

type ProductsPageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ProductsPage({
	searchParams,
}: ProductsPageProps) {
	const searchQuery =
		typeof searchParams?.q === "string" && searchParams.q.trim().length
			? searchParams.q.trim()
			: undefined;
	const categoryId = parseCategoryId(searchParams?.category);

	const [products, categories, brands] = await Promise.all([
		listActiveProducts({
			search: searchQuery,
			categoryId,
			includeOutOfStock: true,
		}),
		listCategoriesWithCounts(),
		listActiveProductBrands(),
	]);

	const totalProducts = categories.reduce(
		(acc, category) => acc + (category.productCount ?? 0),
		0,
	);

	return (
		<SiteShell>
			<ProductsPageClient
				initialProducts={products}
				categories={categories}
				brands={brands}
				totalProducts={totalProducts}
				initialFilters={{ categoryId, searchQuery }}
			/>
		</SiteShell>
	);
}
