"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { ActionResult } from "@/lib/actions";

import { createCategoryAction } from "../actions";

type CategoryActionState = Awaited<
	ReturnType<typeof createCategoryAction>
> | null;

type CategoryFormProps = {
	title?: string;
	description?: string;
};

const initialState: CategoryActionState = null;

export function CategoryForm({
	title = "Crear categoría",
	description = "Agrupa tus productos por familias para organizarlos mejor.",
}: CategoryFormProps) {
	const formRef = useRef<HTMLFormElement>(null);

	const actionHandler = async (
		_prevState: CategoryActionState,
		formData: FormData,
	): Promise<ActionResult<{ category: { id: number; name: string } }>> => {
		const result = await createCategoryAction(formData);
		if (result.success) {
			formRef.current?.reset();
		}
		return result;
	};

	const [state, formAction] = useActionState(actionHandler, initialState);
	const errorBag = state && !state.success ? state.errors : undefined;
	const successMessage = state?.success
		? state.message ?? "Categoría lista"
		: null;

	return (
		<div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
			<div className='border-b border-gray-200 px-6 py-4'>
				<h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
				<p className='mt-1 text-sm text-gray-500'>{description}</p>
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

				<div>
					<label htmlFor='name' className='text-sm font-medium text-gray-700'>
						Nombre de la categoría
					</label>
					<input
						id='name'
						name='name'
						type='text'
						required
						placeholder='Ej. Cuidado facial, Maquillaje, Fragancias…'
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blush-400 focus:outline-none focus:ring-1 focus:ring-blush-300'
					/>
					<FieldError errors={errorBag} name='name' />
				</div>

				<div className='flex justify-end'>
					<SubmitButton label='Guardar categoría' />
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
