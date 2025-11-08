"use client";

import { useState, useTransition } from "react";

import { deleteProductAction } from "../actions";

import { ConfirmDialog } from "./confirm-dialog";

type DeleteProductButtonProps = {
	productId: string;
	productName: string;
};

export function DeleteProductButton({
	productId,
	productName,
}: DeleteProductButtonProps) {
	const [isDialogOpen, setDialogOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		setErrorMessage(null);
		setDialogOpen(true);
	};

	const handleConfirm = () => {
		startTransition(async () => {
			const result = await deleteProductAction(productId);
			if (!result.success) {
				const fallbackMessage = "No pudimos eliminar el producto.";
				const message = result.errors?.form?.join(" ") ?? fallbackMessage;
				setErrorMessage(message);
				return;
			}
			setDialogOpen(false);
		});
	};

	const handleCancel = () => {
		if (isPending) {
			return;
		}
		setDialogOpen(false);
	};

	return (
		<>
			<button
				type='button'
				onClick={handleDelete}
				disabled={isPending}
				className='inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'>
				{isPending ? "Eliminando…" : "Eliminar"}
			</button>
			<ConfirmDialog
				open={isDialogOpen}
				title='¿Eliminar producto?'
				description={`Esta acción eliminará "${productName}" de forma permanente.`}
				helpText={
					errorMessage ? (
						<span className='font-medium text-red-600'>{errorMessage}</span>
					) : (
						"No podrás recuperar el producto una vez eliminado."
					)
				}
				confirmLabel={isPending ? "Eliminando…" : "Eliminar"}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
				confirmDisabled={isPending}
			/>
		</>
	);
}
