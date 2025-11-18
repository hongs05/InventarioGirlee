"use client";

import { useEffect, useState } from "react";

type CartProduct = {
	id: string;
	slug: string;
	name: string;
	currency: string;
	price: number | null;
	imageUrl?: string | null;
};

type AddToCartButtonProps = {
	product: CartProduct;
	quantity?: number;
	variant?: "primary" | "secondary" | "outline";
	size?: "sm" | "md" | "lg";
	className?: string;
	label?: string;
	addedLabel?: string;
};

import { useCart } from "@/components/storefront/cart-context";

const SIZE_STYLES: Record<NonNullable<AddToCartButtonProps["size"]>, string> = {
	sm: "px-3 py-2 text-xs",
	md: "px-4 py-2.5 text-sm",
	lg: "px-5 py-3 text-base",
};

const VARIANT_STYLES: Record<
	NonNullable<AddToCartButtonProps["variant"]>,
	string
> = {
	primary:
		"bg-blush-500 text-white hover:bg-blush-400 border border-transparent",
	secondary:
		"border border-blush-300 bg-white text-blush-600 hover:bg-blush-100/70",
	outline:
		"border border-gray-200 bg-transparent text-gray-700 hover:border-gray-300",
};

export function AddToCartButton({
	product,
	quantity = 1,
	variant = "primary",
	size = "md",
	className,
	label = "Agregar al carrito",
	addedLabel = "Agregado",
}: AddToCartButtonProps) {
	const { addItem } = useCart();
	const [status, setStatus] = useState<"idle" | "added">("idle");

	useEffect(() => {
		if (status !== "added") return;
		const timeout = window.setTimeout(() => setStatus("idle"), 1600);
		return () => window.clearTimeout(timeout);
	}, [status]);

	const handleClick = () => {
		addItem({
			id: product.id,
			slug: product.slug,
			name: product.name,
			currency: product.currency,
			price: product.price,
			imageUrl: product.imageUrl ?? null,
			quantity,
		});
		setStatus("added");
	};

	return (
		<button
			type='button'
			onClick={handleClick}
			className={`inline-flex items-center justify-center rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-blush-200 focus:ring-offset-2 ${
				SIZE_STYLES[size]
			} ${VARIANT_STYLES[variant]} ${className ?? ""}`}>
			{status === "added" ? addedLabel : label}
		</button>
	);
}
