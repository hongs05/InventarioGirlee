"use client";

import { useTransition } from "react";

import { deleteProductAction } from "../actions";

type DeleteProductButtonProps = {
	productId: string;
	productName: string;
};

export function DeleteProductButton({
	productId,
	productName,
}: DeleteProductButtonProps) {
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		const confirmed = window.confirm(
			`¿Deseas eliminar "${productName}"? Esta acción es permanente.`,
		);
		if (!confirmed) {
			return;
		}

		startTransition(async () => {
			const result = await deleteProductAction(productId);
			if (!result.success) {
				const fallbackMessage = "No pudimos eliminar el producto.";
				const errorMessage = result.errors?.form?.join(" ") ?? fallbackMessage;
				window.alert(errorMessage);
			}
		});
	};

	return (
		<button
			type='button'
			onClick={handleDelete}
			disabled={isPending}
			className='inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'>
			{isPending ? "Eliminando…" : "Eliminar"}
		</button>
	);
}
