"use client";

import { useActionState, useCallback, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
	submitInventoryIntakeAction,
	type InventoryIntakeFormState,
} from "../actions";

type ProductOption = {
	id: string;
	name: string;
	quantity: number | null;
	currency: string | null;
	cost_price: number | null;
};

type InventoryIntakeFormProps = {
	products: ProductOption[];
	currencies: string[];
};

const initialState: InventoryIntakeFormState = null;

export function InventoryIntakeForm({
	products,
	currencies,
}: InventoryIntakeFormProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const [quantityPreview, setQuantityPreview] = useState(0);
	const [unitCostPreview, setUnitCostPreview] = useState(0);
	const [selectedProductId, setSelectedProductId] = useState<string>("");
	const defaultCurrency = currencies[0] ?? "NIO";
	const [currencyValue, setCurrencyValue] = useState(defaultCurrency);

	const actionHandler = useCallback(
		async (prevState: InventoryIntakeFormState, formData: FormData) => {
			const result = await submitInventoryIntakeAction(prevState, formData);
			if (result?.success) {
				formRef.current?.reset();
				setQuantityPreview(0);
				setUnitCostPreview(0);
				setSelectedProductId("");
				setCurrencyValue(defaultCurrency);
			}
			return result;
		},
		[defaultCurrency],
	);

	const [state, formAction] = useActionState(actionHandler, initialState);

	const selectedProduct = useMemo(() => {
		if (!selectedProductId) return null;
		return products.find((product) => product.id === selectedProductId) ?? null;
	}, [products, selectedProductId]);

	const computedTotal = useMemo(() => {
		if (
			!Number.isFinite(quantityPreview) ||
			!Number.isFinite(unitCostPreview)
		) {
			return 0;
		}
		return Number((quantityPreview * unitCostPreview).toFixed(2));
	}, [quantityPreview, unitCostPreview]);

	const errorBag = state && !state.success ? state.errors : undefined;

	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Ingreso de inventario
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Registra nuevas unidades en existencias y actualiza los totales
					automáticamente.
				</p>
			</div>
			<form ref={formRef} action={formAction} className='space-y-4 px-6 py-6'>
				{state?.success ? (
					<p className='rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'>
						{state.message ?? "Ingreso registrado correctamente"}
					</p>
				) : null}
				{errorBag?.form ? (
					<div className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
						<ul className='list-disc pl-4'>
							{errorBag.form.map((message, index) => (
								<li key={index}>{message}</li>
							))}
						</ul>
					</div>
				) : null}

				<div>
					<label
						htmlFor='productId'
						className='text-sm font-medium text-gray-700'>
						Producto
					</label>
					<select
						id='productId'
						name='productId'
						required
						value={selectedProductId}
						onChange={(event) => {
							const value = event.target.value;
							setSelectedProductId(value);
							const product = products.find((item) => item.id === value);
							if (product?.currency) {
								setCurrencyValue(product.currency);
							}
						}}
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
						<option value='' disabled>
							Selecciona un producto…
						</option>
						{products.map((product) => (
							<option key={product.id} value={product.id}>
								{product.name}
							</option>
						))}
					</select>
					<FieldError errors={errorBag} name='productId' />
					{selectedProduct ? (
						<p className='mt-1 text-xs text-gray-500'>
							Stock actual: {formatQuantity(selectedProduct.quantity ?? 0)} ·
							Costo unitario registrado:{" "}
							{formatCurrency(
								selectedProduct.cost_price ?? 0,
								selectedProduct.currency ?? "NIO",
							)}
						</p>
					) : null}
				</div>

				<div className='grid gap-4 md:grid-cols-2'>
					<div>
						<label
							htmlFor='quantity'
							className='text-sm font-medium text-gray-700'>
							Cantidad
						</label>
						<input
							id='quantity'
							name='quantity'
							type='number'
							min={1}
							step={1}
							required
							onChange={(event) => {
								const parsed = Number(event.target.value);
								setQuantityPreview(Number.isFinite(parsed) ? parsed : 0);
							}}
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='quantity' />
					</div>
					<div>
						<label
							htmlFor='unitCost'
							className='text-sm font-medium text-gray-700'>
							Costo unitario
						</label>
						<input
							id='unitCost'
							name='unitCost'
							type='number'
							min={0}
							step='0.01'
							required
							onChange={(event) => {
								const parsed = Number(event.target.value);
								setUnitCostPreview(Number.isFinite(parsed) ? parsed : 0);
							}}
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='unitCost' />
					</div>
				</div>

				<div>
					<label
						htmlFor='totalCost'
						className='text-sm font-medium text-gray-700'>
						Costo total (opcional)
					</label>
					<input
						id='totalCost'
						name='totalCost'
						type='number'
						min={0}
						step='0.01'
						placeholder={computedTotal ? computedTotal.toString() : undefined}
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					<FieldError errors={errorBag} name='totalCost' />
					<p className='mt-1 text-xs text-gray-500'>
						Dejar vacío para usar el costo sugerido:{" "}
						{formatCurrency(computedTotal, selectedProduct?.currency ?? "NIO")}.
					</p>
				</div>

				<div className='grid gap-4 md:grid-cols-2'>
					<div>
						<label
							htmlFor='currency'
							className='text-sm font-medium text-gray-700'>
							Moneda
						</label>
						<select
							id='currency'
							name='currency'
							value={currencyValue}
							onChange={(event) => setCurrencyValue(event.target.value)}
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
							{currencies.map((currency) => (
								<option key={currency} value={currency}>
									{currency}
								</option>
							))}
						</select>
						<FieldError errors={errorBag} name='currency' />
					</div>
					<div>
						<label
							htmlFor='occurredAt'
							className='text-sm font-medium text-gray-700'>
							Fecha y hora
						</label>
						<input
							id='occurredAt'
							name='occurredAt'
							type='datetime-local'
							defaultValue={formatDateTimeLocal(new Date())}
							required
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='occurredAt' />
					</div>
				</div>

				<div>
					<label
						htmlFor='providerName'
						className='text-sm font-medium text-gray-700'>
						Proveedor (opcional)
					</label>
					<input
						id='providerName'
						name='providerName'
						type='text'
						placeholder='Nombre del proveedor'
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					<FieldError errors={errorBag} name='providerName' />
				</div>

				<div>
					<label htmlFor='notes' className='text-sm font-medium text-gray-700'>
						Notas (opcional)
					</label>
					<textarea
						id='notes'
						name='notes'
						rows={3}
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					<FieldError errors={errorBag} name='notes' />
				</div>

				<div className='flex justify-end'>
					<SubmitButton label='Registrar ingreso' />
				</div>
			</form>
		</div>
	);
}

function formatQuantity(quantity: number): string {
	const formatted = new Intl.NumberFormat("es-NI").format(quantity ?? 0);
	return `${formatted} ${quantity === 1 ? "unidad" : "unidades"}`;
}

function formatCurrency(value: number, currency = "NIO"): string {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value ?? 0);
}

function formatDateTimeLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function FieldError({
	errors,
	name,
}: {
	errors: Record<string, string[]> | undefined;
	name: string;
}) {
	if (!errors) return null;
	const messages = errors[name];
	if (!messages || messages.length === 0) {
		return null;
	}
	return <p className='mt-1 text-xs text-red-600'>{messages.join(" ")}</p>;
}

function SubmitButton({ label }: { label: string }) {
	const { pending } = useFormStatus();
	return (
		<button
			type='submit'
			disabled={pending}
			className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:opacity-70'>
			{pending ? "Guardando…" : label}
		</button>
	);
}
