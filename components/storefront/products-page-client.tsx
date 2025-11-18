"use client";

import Link from "next/link";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeader } from "@/components/storefront/section-header";
import type {
	StorefrontCategory,
	StorefrontProduct,
} from "@/lib/storefront/types";

type FilterState = {
	search: string;
	categoryId?: number;
	minPrice: string;
	maxPrice: string;
	onlyAvailable: boolean;
	brands: string[];
};

type ProductsPageClientProps = {
	initialProducts: StorefrontProduct[];
	categories: StorefrontCategory[];
	brands: string[];
	totalProducts: number;
	initialFilters: {
		searchQuery?: string;
		categoryId?: number;
	};
};

export function ProductsPageClient({
	initialProducts,
	categories,
	brands: brandOptions,
	totalProducts,
	initialFilters,
}: ProductsPageClientProps) {
	const [products, setProducts] = useState(initialProducts);
	const [filterState, setFilterState] = useState<FilterState>({
		search: initialFilters.searchQuery ?? "",
		categoryId: initialFilters.categoryId,
		minPrice: "",
		maxPrice: "",
		onlyAvailable: false,
		brands: [],
	});
	const [isFetching, setIsFetching] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const filtersRef = useRef(filterState);
	const abortController = useRef<AbortController | null>(null);

	useEffect(() => {
		filtersRef.current = filterState;
	}, [filterState]);

	useEffect(() => {
		return () => {
			abortController.current?.abort();
		};
	}, []);

	const fetchProducts = useCallback(async () => {
		const filters = filtersRef.current;
		if (!filters) {
			return;
		}

		abortController.current?.abort();
		const controller = new AbortController();
		abortController.current = controller;

		setIsFetching(true);
		setFetchError(null);

		try {
			const params = new URLSearchParams();
			if (filters.search.trim()) {
				params.set("q", filters.search.trim());
			}
			if (typeof filters.categoryId === "number") {
				params.set("category", String(filters.categoryId));
			}
			for (const brand of filters.brands) {
				params.append("brand", brand);
			}
			if (filters.minPrice.trim()) {
				params.set("minPrice", filters.minPrice.trim());
			}
			if (filters.maxPrice.trim()) {
				params.set("maxPrice", filters.maxPrice.trim());
			}
			if (filters.onlyAvailable) {
				params.set("onlyAvailable", "true");
			}

			const queryString = params.toString();
			if (typeof window !== "undefined") {
				const nextUrl = queryString
					? `${window.location.pathname}?${queryString}`
					: window.location.pathname;
				window.history.replaceState(null, "", nextUrl);
			}

			const response = await fetch(
				`/api/storefront/products${queryString ? `?${queryString}` : ""}`,
				{ signal: controller.signal },
			);

			if (!response.ok) {
				throw new Error("No se pudieron obtener los productos");
			}

			const payload = (await response.json()) as {
				products: StorefrontProduct[];
			};

			setProducts(payload.products ?? []);
		} catch (error) {
			if ((error as Error).name === "AbortError") {
				return;
			}
			console.error("[storefront] fetchProducts", error);
			setFetchError(
				"No pudimos actualizar los productos. Intenta de nuevo más tarde.",
			);
		} finally {
			setIsFetching(false);
		}
	}, []);

	const firstSearchEffect = useRef(true);
	const firstOtherEffect = useRef(true);
	const brandKey = useMemo(() => filterState.brands.join("|"), [
		filterState.brands,
	]);

	useEffect(() => {
		if (firstSearchEffect.current) {
			firstSearchEffect.current = false;
			return;
		}
		const timeout = window.setTimeout(() => {
			fetchProducts();
		}, 450);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [filterState.search, fetchProducts]);

	useEffect(() => {
		if (firstOtherEffect.current) {
			firstOtherEffect.current = false;
			return;
		}
		fetchProducts();
	}, [
		filterState.categoryId,
		filterState.minPrice,
		filterState.maxPrice,
		filterState.onlyAvailable,
		brandKey,
		fetchProducts,
	]);

	const handleCategoryChange = (categoryId?: number) => {
		setFilterState((prev) => ({
			...prev,
			categoryId: prev.categoryId === categoryId ? undefined : categoryId,
		}));
	};

	const toggleBrand = (brand: string) => {
		setFilterState((prev) => {
			const hasBrand = prev.brands.includes(brand);
			const nextBrands = hasBrand
				? prev.brands.filter((current) => current !== brand)
				: [...prev.brands, brand];
			return { ...prev, brands: nextBrands };
		});
	};

	const resetFilters = () => {
		setFilterState({
			search: initialFilters.searchQuery ?? "",
			categoryId: initialFilters.categoryId,
			minPrice: "",
			maxPrice: "",
			onlyAvailable: false,
			brands: [],
		});
	};

	const hasActiveBrandFilters = filterState.brands.length > 0;

	return (
		<section className='space-y-8'>
			<SectionHeader
				title='Catálogo Girlee'
				subtitle='Explora nuestras novedades, descubre tus marcas favoritas y construye una rutina a tu medida.'
				action={
					<Link
						href='/contact'
						className='inline-flex items-center rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-100/70'>
						Asesoría personalizada
					</Link>
				}
			/>

			<div className='grid gap-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm lg:grid-cols-[260px_1fr]'>
				<aside className='space-y-6'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Categorías
						</p>
						<nav className='mt-4 space-y-2 text-sm text-gray-600'>
							<button
								type='button'
								onClick={() => handleCategoryChange(undefined)}
								className={`flex w-full items-center justify-between rounded-full px-3 py-2 text-left transition ${
									!filterState.categoryId
										? "bg-blush-100 text-blush-600"
										: "hover:bg-blush-50 hover:text-blush-600"
								}`}>
								<span className='text-sm font-medium'>Todas</span>
								<span className='rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-500'>
									{totalProducts || 0}
								</span>
							</button>
							{categories.map((category) => (
								<button
									key={category.id}
									type='button'
									onClick={() => handleCategoryChange(category.id)}
									className={`flex w-full items-center justify-between rounded-full px-3 py-2 text-left transition ${
										filterState.categoryId === category.id
											? "bg-blush-100 text-blush-600"
											: "hover:bg-blush-50 hover:text-blush-600"
									}`}>
									<span className='text-sm font-medium'>{category.name}</span>
									{typeof category.productCount === "number" ? (
										<span className='rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-500'>
											{category.productCount}
										</span>
									) : null}
								</button>
							))}
						</nav>
					</div>

					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Buscar
						</p>
						<div className='mt-4 space-y-3'>
							<input
								type='search'
								value={filterState.search}
								onChange={(event) =>
									setFilterState((prev) => ({
										...prev,
										search: event.target.value,
									}))
								}
								placeholder='Encuentra por nombre, marca o descripción'
								className='w-full rounded-full border border-blush-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
							/>
						</div>
					</div>

					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Precio
						</p>
						<div className='mt-3 space-y-3 text-sm text-gray-600'>
							<label className='flex w-full flex-col gap-1'>
								<span className='text-xs font-semibold text-gray-500'>
									Desde
								</span>
								<input
									type='number'
									step='0.01'
									min='0'
									value={filterState.minPrice}
									onChange={(event) =>
										setFilterState((prev) => ({
											...prev,
											minPrice: event.target.value,
										}))
									}
									className='w-full rounded-full border border-blush-200 bg-white px-4 py-2 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
								/>
							</label>
							<label className='flex w-full flex-col gap-1'>
								<span className='text-xs font-semibold text-gray-500'>
									Hasta
								</span>
								<input
									type='number'
									step='0.01'
									min='0'
									value={filterState.maxPrice}
									onChange={(event) =>
										setFilterState((prev) => ({
											...prev,
											maxPrice: event.target.value,
										}))
									}
									className='w-full rounded-full border border-blush-200 bg-white px-4 py-2 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
								/>
							</label>
						</div>
					</div>

					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Marcas
						</p>
						<div className='mt-3 flex flex-wrap gap-2 text-sm'>
							{brandOptions.length ? (
								brandOptions.map((brand) => {
									const isActive = filterState.brands.includes(brand);
									return (
										<button
											key={brand}
											type='button'
											onClick={() => toggleBrand(brand)}
											className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
												isActive
													? "border-blush-500 bg-blush-100 text-blush-600"
													: "border-blush-200 text-gray-600 hover:border-blush-400 hover:bg-blush-50"
											}`}>
											{brand}
										</button>
									);
								})
							) : (
								<p className='text-xs text-gray-500'>
									Aún no tenemos marcas registradas.
								</p>
							)}
						</div>
						{hasActiveBrandFilters ? (
							<button
								type='button'
								onClick={() => setFilterState((prev) => ({ ...prev, brands: [] }))}
								className='mt-2 text-xs font-semibold text-blush-500 transition hover:text-blush-600'>
								Limpiar marcas
							</button>
						) : null}
					</div>

					<div className='flex flex-col gap-3 rounded-2xl border border-blush-200 bg-blush-50/70 p-5 text-sm text-gray-600'>
						<label className='inline-flex items-center gap-3 text-gray-800'>
							<input
								type='checkbox'
								checked={filterState.onlyAvailable}
								onChange={(event) =>
									setFilterState((prev) => ({
										...prev,
										onlyAvailable: event.target.checked,
									}))
								}
								className='h-4 w-4 rounded border-blush-300 text-blush-500 focus:ring-blush-400'
							/>
							<span className='text-sm font-semibold'>
								Solo disponibles
							</span>
						</label>
						<p>
							Muestra únicamente los productos con cantidad en inventario.
						</p>
						<Link
							href='/contact'
							className='inline-flex items-center rounded-full bg-blush-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blush-400'>
							Contactar
						</Link>
					</div>

					<button
						type='button'
						onClick={resetFilters}
						className='w-full rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-100/70'>
						Restablecer filtros
					</button>
				</aside>

				<div className='space-y-6'>
					<div className='flex items-center justify-between gap-4'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
							Resultados
						</p>
						<p className='text-xs font-semibold uppercase tracking-[0.3em] text-gray-400'>
							{isFetching ? "Actualizando..." : `${products.length} productos`}
						</p>
					</div>

					{fetchError ? (
						<div className='rounded-2xl border border-dashed border-blush-200 bg-white/70 p-10 text-center text-sm text-gray-500'>
							<p>{fetchError}</p>
							<button
								type='button'
								onClick={fetchProducts}
								className='mt-4 inline-flex items-center rounded-full border border-blush-200 px-4 py-2 text-xs font-semibold text-blush-500 transition hover:border-blush-300 hover:bg-blush-100/70'>
								Intentar nuevamente
							</button>
						</div>
					) : products.length ? (
						<div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
							{products.map((product) => (
								<ProductCard key={product.id} product={product} />
							))}
						</div>
					) : (
						<div className='rounded-2xl border border-dashed border-blush-200 bg-white/70 p-10 text-center text-sm text-gray-500'>
							No encontramos productos con los filtros seleccionados. Ajusta
							tu búsqueda o conversa con nuestro equipo.
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
