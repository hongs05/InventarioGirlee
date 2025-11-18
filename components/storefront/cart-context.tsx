"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type CartItem = {
	id: string;
	slug: string;
	name: string;
	currency: string;
	price: number | null;
	imageUrl: string | null;
	quantity: number;
};

type AddItemPayload = {
	id: string;
	slug: string;
	name: string;
	currency: string;
	price: number | null;
	imageUrl?: string | null;
	quantity?: number;
};

type CartContextValue = {
	items: CartItem[];
	itemCount: number;
	subtotal: number;
	hasItemsWithoutPrice: boolean;
	isHydrated: boolean;
	addItem: (item: AddItemPayload) => void;
	removeItem: (id: string) => void;
	updateQuantity: (id: string, quantity: number) => void;
	clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "inventariogirlee:cart";

function sanitizeQuantity(value: number | undefined) {
	if (!value || Number.isNaN(value) || value < 1) {
		return 1;
	}
	return Math.min(Math.round(value), 99);
}

function sanitizeStoredItems(candidate: unknown): CartItem[] {
	if (!Array.isArray(candidate)) return [];
	return candidate
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const { id, slug, name, currency, price, imageUrl, quantity } =
				item as Record<string, unknown>;
			if (
				typeof id !== "string" ||
				typeof slug !== "string" ||
				typeof name !== "string"
			) {
				return null;
			}
			const safeCurrency =
				typeof currency === "string" && currency.trim() ? currency : "NIO";
			const safePrice =
				typeof price === "number" && Number.isFinite(price) ? price : null;
			const safeImage = typeof imageUrl === "string" ? imageUrl : null;
			return {
				id,
				slug,
				name,
				currency: safeCurrency,
				price: safePrice,
				imageUrl: safeImage,
				quantity: sanitizeQuantity(typeof quantity === "number" ? quantity : 1),
			} satisfies CartItem;
		})
		.filter((item): item is CartItem => Boolean(item));
}

export function CartProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<CartItem[]>([]);
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const stored = window.localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as unknown;
				// eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating local storage into state once on mount
				setItems(sanitizeStoredItems(parsed));
			}
		} catch (error) {
			console.warn("[cart] Unable to read local storage", error);
		}
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (!isHydrated || typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch (error) {
			console.warn("[cart] Unable to persist cart", error);
		}
	}, [items, isHydrated]);

	const addItem = useCallback((payload: AddItemPayload) => {
		setItems((prev) => {
			const nextQuantity = sanitizeQuantity(payload.quantity ?? 1);
			const existingIndex = prev.findIndex((item) => item.id === payload.id);
			if (existingIndex >= 0) {
				const next = [...prev];
				next[existingIndex] = {
					...next[existingIndex],
					quantity: sanitizeQuantity(
						next[existingIndex].quantity + nextQuantity,
					),
				};
				return next;
			}

			const newItem: CartItem = {
				id: payload.id,
				slug: payload.slug,
				name: payload.name,
				currency: payload.currency ?? "NIO",
				price:
					typeof payload.price === "number" && Number.isFinite(payload.price)
						? payload.price
						: null,
				imageUrl: payload.imageUrl ?? null,
				quantity: nextQuantity,
			};
			return [...prev, newItem];
		});
	}, []);

	const removeItem = useCallback((id: string) => {
		setItems((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const updateQuantity = useCallback((id: string, quantity: number) => {
		setItems((prev) =>
			prev.map((item) =>
				item.id === id
					? {
							...item,
							quantity: sanitizeQuantity(quantity),
					  }
					: item,
			),
		);
	}, []);

	const clearCart = useCallback(() => {
		setItems([]);
	}, []);

	const derived = useMemo(() => {
		const subtotal = items.reduce<number>((acc, item) => {
			if (typeof item.price === "number" && Number.isFinite(item.price)) {
				return acc + item.price * item.quantity;
			}
			return acc;
		}, 0);
		const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
		const hasItemsWithoutPrice = items.some((item) => item.price === null);

		return {
			items,
			itemCount,
			subtotal,
			hasItemsWithoutPrice,
			isHydrated,
			addItem,
			removeItem,
			updateQuantity,
			clearCart,
		};
	}, [items, addItem, removeItem, updateQuantity, clearCart, isHydrated]);

	return (
		<CartContext.Provider value={derived}>{children}</CartContext.Provider>
	);
}

export function useCart() {
	const context = useContext(CartContext);
	if (!context) {
		throw new Error("useCart must be used within a CartProvider");
	}
	return context;
}
