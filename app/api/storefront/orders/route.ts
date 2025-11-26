import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type IncomingItem = {
	id: string;
	name: string;
	slug: string;
	currency: string;
	price: number | null;
	quantity: number;
	imageUrl?: string | null;
};

function validateString(value: unknown) {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

function sanitizeItems(candidate: unknown): IncomingItem[] {
	if (!Array.isArray(candidate)) return [];
	return candidate
		.map((item): IncomingItem | null => {
			if (!item || typeof item !== "object") return null;
			const { id, name, slug, currency, price, quantity, imageUrl } =
				item as Record<string, unknown>;
			if (
				typeof id !== "string" ||
				typeof name !== "string" ||
				typeof slug !== "string"
			) {
				return null;
			}
			const safeCurrency =
				typeof currency === "string" && currency.trim()
					? currency.trim()
					: "NIO";
			const safePrice =
				typeof price === "number" && Number.isFinite(price) ? price : null;
			const safeQuantity =
				typeof quantity === "number" && Number.isFinite(quantity)
					? Math.min(99, Math.max(1, Math.round(quantity)))
					: 1;
			const safeImage = typeof imageUrl === "string" ? imageUrl : null;
			return {
				id,
				name,
				slug,
				currency: safeCurrency,
				price: safePrice,
				quantity: safeQuantity,
				imageUrl: safeImage,
			};
		})
		.filter((item): item is IncomingItem => Boolean(item));
}

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			name?: string;
			phone?: string;
			email?: string;
			message?: string;
			delivery?: string;
			deliveryLabel?: string;
			payment?: string;
			paymentLabel?: string;
			paymentPreference?: string;
			items?: IncomingItem[];
			subtotal?: number;
			currency?: string;
			hasItemsWithoutPrice?: boolean;
		};

		const customer_name = validateString(payload.name);
		const customer_phone = validateString(payload.phone);
		const customer_email = validateString(payload.email);
		const deliveryLabel =
			validateString(payload.deliveryLabel) ?? validateString(payload.delivery);
		const paymentLabel =
			validateString(payload.paymentLabel) ??
			validateString(payload.paymentPreference);
		const currency = validateString(payload.currency) ?? "NIO";
		const items = sanitizeItems(payload.items);

		if (!customer_name || !customer_phone || !customer_email) {
			return NextResponse.json(
				{ error: "Necesitamos tu nombre, teléfono y correo para continuar" },
				{ status: 400 },
			);
		}

		if (!items.length) {
			return NextResponse.json(
				{ error: "Tu carrito está vacío. Agrega productos antes de reservar." },
				{ status: 400 },
			);
		}
		const subtotal =
			typeof payload.subtotal === "number" && Number.isFinite(payload.subtotal)
				? payload.subtotal
				: 0;

		const formattedSubtotal =
			subtotal > 0
				? new Intl.NumberFormat("es-NI", {
						style: "currency",
						currency,
				  }).format(subtotal)
				: null;

		const notesParts = [
			validateString(payload.message),
			deliveryLabel ? `Entrega: ${deliveryLabel}` : null,
			paymentLabel ? `Pago preferido: ${paymentLabel}` : null,
			formattedSubtotal ? `Subtotal estimado: ${formattedSubtotal}` : null,
			payload.hasItemsWithoutPrice
				? "Incluye artículos con precio a confirmar."
				: null,
			items.length
				? `Items: ${items.map((i) => `${i.name} x${i.quantity}`).join(", ")}`
				: null,
		].filter(Boolean);
		const notes = notesParts.length ? notesParts.join(" | ") : null;

		const payment_method =
			typeof payload.payment === "string" &&
			["cash", "card", "transfer"].includes(payload.payment)
				? payload.payment
				: "cash";

		if (subtotal <= 0 && !payload.hasItemsWithoutPrice) {
			return NextResponse.json(
				{
					error:
						"No pudimos calcular tu subtotal. Intenta actualizar tu carrito.",
				},
				{ status: 400 },
			);
		}

		const admin = createSupabaseAdminClient();
		const { data, error } = await admin
			.from("orders")
			.insert({
				customer_name,
				customer_phone,
				customer_email,
				notes,
				status: "pending",
				payment_method,
				subtotal_amount: subtotal,
				discount_amount: 0,
				tax_amount: 0,
				total_amount: subtotal,
				total_cost: 0,
				profit_amount: 0,
				currency,
			})
			.select("id")
			.single();

		if (error || !data) {
			console.error("[storefront] create order", error);
			return NextResponse.json(
				{ error: "No se pudo crear la reserva" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ orderId: data.id });
	} catch (error) {
		console.error("[storefront] create order payload", error);
		return NextResponse.json(
			{ error: "No pudimos procesar tu solicitud" },
			{ status: 400 },
		);
	}
}
