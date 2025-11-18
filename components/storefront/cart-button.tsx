"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useCart } from "@/components/storefront/cart-context";

export function CartButton() {
	const { itemCount, isHydrated } = useCart();

	const badge = useMemo(() => {
		if (!isHydrated) return null;
		if (itemCount === 0) return null;
		return (
			<span className='ml-1 inline-flex min-w-7 items-center justify-center rounded-full bg-blush-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm'>
				{itemCount}
			</span>
		);
	}, [itemCount, isHydrated]);

	return (
		<Link
			href='/cart'
			className='inline-flex items-center rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-100/70'>
			<span className='mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-semibold'>
				🛒
			</span>
			Carrito
			{badge}
		</Link>
	);
}
