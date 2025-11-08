"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionResult } from "@/lib/actions";

import { createSubcategoryAction } from "../actions";

type SubcategoryActionState = Awaited<
	ReturnType<typeof createSubcategoryAction>
> | null;

type SubcategoryFormProps = {
	categories: Array<{ id: number; name: string }>;
};

const initialState: SubcategoryActionState = null;

export function SubcategoryForm({ categories }: SubcategoryFormProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const hasCategories = categories.length > 0;
	const defaultCategoryValue = useMemo(() => {
		if (!hasCategories) {
			return "";
		}
		return String(categories[0]?.id ?? "");
	}, [categories, hasCategories]);

	const [categoryValue, setCategoryValue] = useState(defaultCategoryValue);

	const actionHandler = async (
		_prevState: SubcategoryActionState,
		formData: FormData,
	): Promise<
		ActionResult<{
			subcategory: { id: number; name: string; categoryId: number };
		}>
	> => {
		const result = await createSubcategoryAction(formData);
		if (result.success) {
			formRef.current?.reset();
			setCategoryValue(defaultCategoryValue);
		}
		return result;
	};

	const [state, formAction] = useActionState(actionHandler, initialState);
	const errorBag = state && !state.success ? state.errors : undefined;
	const successMessage = state?.success
		? state.message ?? "Subcategoría lista"
		: null;

	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>
					Crear subcategoría
				</h2>
				<p className='mt-1 text-sm text-gray-500'>
					Detalla tus categorías asignando subniveles específicos, por ejemplo
					Sérums dentro de Cuidado facial.
				</p>
			</div>
			<form ref={formRef} action={formAction} className='space-y-4 px-6 py-6'>
				{successMessage ? (
					<p className='rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'>
						{successMessage}
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

				{!hasCategories ? (
					<p className='rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
						Crea al menos una categoría antes de agregar subcategorías.
					</p>
				) : null}

				<div className='grid gap-4 md:grid-cols-2'>
					<div>
						<label
							htmlFor='subcategory-category'
							className='text-sm font-medium text-gray-700'>
							Categoría padre
						</label>
						<select
							id='subcategory-category'
							name='categoryId'
							required
							disabled={!hasCategories}
							value={categoryValue}
							onChange={(event) => setCategoryValue(event.target.value)}
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300 disabled:cursor-not-allowed disabled:opacity-60'>
							<option value=''>Selecciona una categoría</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
						<FieldError errors={errorBag} name='categoryId' />
					</div>
					<div>
						<label
							htmlFor='subcategory-name'
							className='text-sm font-medium text-gray-700'>
							Nombre de la subcategoría
						</label>
						<input
							id='subcategory-name'
							name='name'
							type='text'
							required
							placeholder='Ej. Sérums, Labiales, Aromaterapia…'
							className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
						/>
						<FieldError errors={errorBag} name='name' />
					</div>
				</div>

				<div className='flex justify-end'>
					<SubmitButton
						label='Guardar subcategoría'
						disabled={!hasCategories}
					/>
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

function SubmitButton({
	label,
	disabled,
}: {
	label: string;
	disabled?: boolean;
}) {
	const { pending } = useFormStatus();
	const isDisabled = disabled ?? false;
	return (
		<button
			type='submit'
			disabled={pending || isDisabled}
			className='inline-flex items-center rounded-md bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blush-400 disabled:cursor-not-allowed disabled:opacity-70'>
			{pending ? "Guardando…" : label}
		</button>
	);
}
