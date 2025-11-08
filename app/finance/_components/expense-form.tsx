"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitExpenseAction, type ExpenseFormState } from "../actions";

type ExpenseFormProps = {
	currencies: string[];
};

const TYPE_OPTIONS = [
	{ value: "expense", label: "Gasto operativo" },
	{ value: "inventory", label: "Inventario" },
];

const initialState: ExpenseFormState = null;

export function ExpenseForm({ currencies }: ExpenseFormProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const defaultCurrency = currencies[0] ?? "NIO";
	const [currencyValue, setCurrencyValue] = useState(defaultCurrency);
	const [typeValue, setTypeValue] = useState<string>(
		TYPE_OPTIONS[0]?.value ?? "expense",
	);

	const actionHandler = useCallback(
		async (prevState: ExpenseFormState, formData: FormData) => {
			const result = await submitExpenseAction(prevState, formData);
			if (result?.success) {
				formRef.current?.reset();
				setCurrencyValue(defaultCurrency);
				setTypeValue(TYPE_OPTIONS[0]?.value ?? "expense");
			}
			return result;
		},
		[defaultCurrency],
	);

	const [state, formAction] = useActionState(actionHandler, initialState);

	const errorBag = state && !state.success ? state.errors : undefined;

	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>Registrar gasto</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Controla los egresos operativos y clasifícalos por tipo y categoría.
				</p>
			</div>
			<form ref={formRef} action={formAction} className='space-y-4 px-6 py-6'>
				{state?.success ? (
					<p className='rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'>
						{state.message ?? "Gasto registrado correctamente"}
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
						htmlFor='description'
						className='text-sm font-medium text-gray-700'>
						Descripción
					</label>
					<textarea
						id='description'
						name='description'
						required
						rows={2}
						placeholder='Ej. Compra de materiales, pago de servicios…'
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					<FieldError errors={errorBag} name='description' />
				</div>

				<div className='grid gap-4 md:grid-cols-2'>
					<div>
						<label htmlFor='type' className='text-sm font-medium text-gray-700'>
							Tipo de gasto
						</label>
						<select
							id='type'
							name='type'
							required
							value={typeValue}
							onChange={(event) => setTypeValue(event.target.value)}
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'>
							{TYPE_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<FieldError errors={errorBag} name='type' />
					</div>
					<div>
						<label
							htmlFor='category'
							className='text-sm font-medium text-gray-700'>
							Categoría (opcional)
						</label>
						<input
							id='category'
							name='category'
							type='text'
							placeholder='Ej. Servicios, Logística, Nómina…'
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='category' />
					</div>
				</div>

				<div className='grid gap-4 md:grid-cols-2'>
					<div>
						<label
							htmlFor='amount'
							className='text-sm font-medium text-gray-700'>
							Monto
						</label>
						<input
							id='amount'
							name='amount'
							type='number'
							min={0}
							step='0.01'
							required
							placeholder='0.00'
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='amount' />
					</div>
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
				</div>

				<div className='grid gap-4 md:grid-cols-2'>
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
							required
							defaultValue={formatDateTimeLocal(new Date())}
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='occurredAt' />
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
							placeholder='Nombre del proveedor o beneficiario'
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='providerName' />
					</div>
				</div>

				<div>
					<label
						htmlFor='reference'
						className='text-sm font-medium text-gray-700'>
						Referencia (opcional)
					</label>
					<input
						id='reference'
						name='reference'
						type='text'
						placeholder='Número de factura, recibo o comprobante'
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					<FieldError errors={errorBag} name='reference' />
				</div>

				<div className='flex justify-end'>
					<SubmitButton label='Registrar gasto' />
				</div>
			</form>
		</div>
	);
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

function formatDateTimeLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}
