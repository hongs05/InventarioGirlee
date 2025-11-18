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
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request) {
	try {
		const payload = (await request.json()) as {
			name?: string;
			phone?: string;
			email?: string;
			message?: string;
			delivery?: string;
			payment?: string;
			items?: IncomingItem[];
			subtotal?: number;
		};

		const customer_name = validateString(payload.name);
		const customer_phone = validateString(payload.phone);
		const customer_email = validateString(payload.email);
		const notesParts = [
			validateString(payload.message),
			validateString(payload.delivery)
				? `Entrega: ${payload.delivery}`
				: null,
			Array.isArray(payload.items)
				? `Items: ${payload.items
						.map((i) => `${i.name} x${i.quantity}`)
						.join(", ")}`
				: null,
		].filter(Boolean);
		const notes = notesParts.length ? notesParts.join(" | ") : null;

		const subtotal =
			typeof payload.subtotal === "number" && Number.isFinite(payload.subtotal)
				? payload.subtotal
				: 0;

		const payment_method =
			typeof payload.payment === "string" &&
			["cash", "card", "transfer"].includes(payload.payment)
				? payload.payment
				: "cash";

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
				currency: "NIO",
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
