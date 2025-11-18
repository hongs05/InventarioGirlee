"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/storefront/cart-context";
import { SectionHeader } from "@/components/storefront/section-header";
import { SiteShell } from "@/components/storefront/site-shell";

const DELIVERY_OPTIONS = [
	{
		value: "coordination",
		title: "Coordinación personalizada",
		body: "Nuestro equipo te contacta por WhatsApp o llamada para afinar horarios y confirmarte precios especiales.",
	},
	{
		value: "pickup",
		title: "Retiro en tienda",
		body: "Recoge tu selección en nuestro espacio de Managua con cita previa y degustaciones a la medida.",
	},
	{
		value: "delivery",
		title: "Entrega express",
		body: "Envío al día siguiente dentro de Managua o coordinación nacional según disponibilidad.",
	},
] as const;

const PAYMENT_OPTIONS = [
	{
		value: "whatsapp",
		label: "Responder por WhatsApp",
		description: "Confirmamos total y enlace para abonar cuando tú estés lista.",
	},
	{
		value: "transfer",
		label: "Transferencia",
		description: "Te enviamos la factura y datos bancarios para completar el pago.",
	},
	{
		value: "cod",
		label: "Contraentrega",
		description: "Paga en efectivo o con tarjeta cuando recibas tu paquete.",
	},
] as const;

function formatCurrency(value: number, currency?: string) {
	if (!currency) currency = "NIO";
	try {
		return new Intl.NumberFormat("es-NI", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
		}).format(value);
	} catch (error) {
		console.warn("[checkout] unable to format price", error);
		return `${value} ${currency}`;
	}
}

export default function CheckoutPage() {
	const { items, itemCount, subtotal, hasItemsWithoutPrice, clearCart } =
		useCart();
	const hasItems = itemCount > 0;
	const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
	const [delivery, setDelivery] = useState<string>(DELIVERY_OPTIONS[0].value);
	const [payment, setPayment] = useState<string>(PAYMENT_OPTIONS[0].value);
	const [form, setForm] = useState({
		name: "",
		phone: "",
		email: "",
		message: "",
	});
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!hasItems) return;
		setStatus("submitting");
		setError(null);

		try {
			const paymentMethod =
				payment === "transfer"
					? "transfer"
					: payment === "cod"
					? "cash"
					: "cash";

			const response = await fetch("/api/storefront/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: form.name,
					phone: form.phone,
					email: form.email,
					message: form.message,
					delivery,
					payment: paymentMethod,
					items,
					subtotal,
				}),
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(
					typeof payload?.error === "string"
						? payload.error
						: "No pudimos registrar tu reserva. Intenta de nuevo.",
				);
			}

			clearCart();
			setStatus("done");
		} catch (err) {
			console.error("[checkout] submit failed", err);
			setError(
				err instanceof Error
					? err.message
					: "No pudimos registrar tu reserva. Intenta de nuevo.",
			);
			setStatus("idle");
		}
	};

	return (
		<SiteShell>
			<section className='space-y-8'>
				<SectionHeader
					title='Tu checkout Girlee'
					subtitle='Reserva tu ritual, coordina la entrega y elige cómo cerrar tu compra.'
					action={
						<Link
							href='/products'
							className='inline-flex items-center rounded-full border border-blush-200 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:border-blush-300 hover:bg-blush-100/70'>
							Seguir explorando
						</Link>
					}
				/>

				<div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]'>
					<form
						onSubmit={handleSubmit}
						className='space-y-6 rounded-3xl border border-blush-100 bg-white/80 p-6 shadow-sm'>
						{error ? (
							<div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
								{error}
							</div>
						) : null}
						{!hasItems ? (
							<div className='space-y-3 text-center text-sm text-gray-600'>
								<p className='text-lg font-semibold text-gray-900'>
									Añade productos a tu carrito antes de continuar
								</p>
								<p>
									Explora el catálogo y guarda tus favoritos. Cuando estés lista,
									regresa para coordinar tu pedido.
								</p>
								<Link
									href='/products'
									className='inline-flex items-center rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blush-400'>
									Ver catálogo completo
								</Link>
							</div>
						) : (
							<>
								<div className='space-y-2'>
									<h2 className='text-lg font-semibold text-gray-900'>
										Contacto y envío
									</h2>
									<p className='text-xs uppercase tracking-[0.3em] text-blush-500'>
										Personaliza la coordinación
									</p>
								</div>

								<div className='grid gap-3 sm:grid-cols-2'>
									<label className='flex flex-col gap-1 text-sm text-gray-600'>
										<span>Nombre completo</span>
										<input
											required
											type='text'
											value={form.name}
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													name: event.target.value,
												}))
											}
											className='w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
										/>
									</label>
									<label className='flex flex-col gap-1 text-sm text-gray-600'>
										<span>Teléfono o WhatsApp</span>
										<input
											required
											type='tel'
											value={form.phone}
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													phone: event.target.value,
												}))
											}
											className='w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
										/>
									</label>
								</div>

								<label className='flex flex-col gap-1 text-sm text-gray-600'>
									<span>Correo electrónico</span>
									<input
										required
										type='email'
										value={form.email}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												email: event.target.value,
											}))
										}
										className='w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
									/>
								</label>

								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<div>
											<h3 className='text-sm font-semibold text-gray-900'>
												Método de entrega
											</h3>
											<p className='text-xs text-gray-500'>
												Selecciona lo que mejor se adapte a tu agenda.
											</p>
										</div>
										<span className='text-xs uppercase tracking-[0.3em] text-blush-500'>
											{itemCount} artículos
										</span>
									</div>
									<div className='grid gap-3'>
										{DELIVERY_OPTIONS.map((option) => (
											<button
												key={option.value}
												type='button'
												onClick={() => setDelivery(option.value)}
												className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
													delivery === option.value
														? "border-blush-400 bg-blush-50"
														: "border-blush-200 hover:border-blush-400 hover:bg-white"
												}`}>
												<span className='text-sm font-semibold text-gray-900'>
													{option.title}
												</span>
												<span className='text-xs text-gray-500'>{option.body}</span>
											</button>
										))}
									</div>
								</div>

								<div className='space-y-3'>
									<h3 className='text-sm font-semibold text-gray-900'>
										Método de pago preferido
									</h3>
									<div className='grid gap-3'>
										{PAYMENT_OPTIONS.map((option) => (
											<label
												key={option.value}
												className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
													payment === option.value
														? "border-blush-400 bg-blush-50"
														: "border-blush-200 hover:border-blush-400 hover:bg-white"
												}`}>
												<div className='flex flex-col gap-0.5 text-sm'>
													<span className='font-semibold text-gray-900'>
														{option.label}
													</span>
													<span className='text-xs text-gray-500'>
														{option.description}
													</span>
												</div>
												<input
													type='radio'
													name='payment'
													value={option.value}
													checked={payment === option.value}
													onChange={() => setPayment(option.value)}
													className='h-5 w-5 text-blush-500'
												/>
											</label>
										))}
									</div>
								</div>

								<label className='flex flex-col gap-1 text-sm text-gray-600'>
									<span>Notas y deseos especiales</span>
									<textarea
										value={form.message}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												message: event.target.value,
											}))
										}
										rows={3}
										placeholder='¿Hay fechas especiales, aromas favoritos o kits específicos?'
										className='w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200'
									/>
								</label>

								<div className='space-y-3 text-xs text-gray-500'>
									<p>
										Tu selección estará disponible por 24 horas mientras
										coordinamos el pago y la entrega.
									</p>
									{hasItemsWithoutPrice ? (
										<p className='text-xs text-blush-500'>
											Algunos productos requieren confirmación de precio.
											Te contactamos antes de cerrar tu pedido.
										</p>
									) : null}
								</div>

								<button
									type='submit'
									disabled={!hasItems || status === "submitting"}
									className='inline-flex w-full items-center justify-center rounded-full bg-blush-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:bg-blush-200'>
									{status === "submitting"
										? "Coordinando..."
										: status === "done"
										? "Solicitud recibida"
										: "Reservar ahora"}
								</button>
							</>
						)}
					</form>

					<aside className='space-y-4 rounded-3xl border border-blush-100 bg-white/90 p-6 shadow-sm'>
						<div className='space-y-2'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-blush-500'>
								Resumen elegante
							</p>
							<h2 className='text-lg font-semibold text-gray-900'>
								Mirada rápida
							</h2>
						</div>
						<div className='space-y-3 text-sm text-gray-600'>
							{items.map((item) => (
								<div key={item.id} className='flex items-center justify-between'>
									<div>
										<p className='font-semibold text-gray-900'>{item.name}</p>
										<p className='text-xs text-gray-500'>
											x{item.quantity} · {item.currency}
										</p>
									</div>
									<p className='text-sm font-semibold text-gray-900'>
										{typeof item.price === "number"
											? formatCurrency(item.price * item.quantity, item.currency)
											: "Precio a coordinar"}
									</p>
								</div>
							))}
						</div>
						<div className='rounded-2xl border border-dashed border-blush-200 bg-blush-50/70 p-4 text-sm text-gray-600'>
							<div className='flex items-center justify-between'>
								<span>Subtotal estimado</span>
								<span className='font-semibold text-gray-900'>
									{formatCurrency(subtotal, items[0]?.currency)}
								</span>
							</div>
							{hasItemsWithoutPrice ? (
								<p className='mt-2 text-xs text-blush-500'>
									Confirmaremos precios para los artículos a coordinar.
								</p>
							) : (
								<p className='mt-2 text-xs text-gray-500'>
									Los impuestos y envío se calculan al confirmar el pago.
								</p>
							)}
						</div>
						{status === "done" ? (
							<div className='rounded-2xl border border-blush-200 bg-white/80 p-4 text-sm text-blush-600'>
								<p className='font-semibold text-gray-900'>
									¡Gracias por reservar!
								</p>
								<p>
									Nuestro equipo te escribirá por WhatsApp para cerrar los
									detalles.
								</p>
							</div>
						) : null}
					</aside>
				</div>
			</section>
		</SiteShell>
	);
}
