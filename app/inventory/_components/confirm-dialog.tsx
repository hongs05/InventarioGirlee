"use client";

import { PropsWithChildren, ReactNode } from "react";
import { createPortal } from "react-dom";

export type ConfirmDialogProps = {
	open: boolean;
	title: string;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmDisabled?: boolean;
	helpText?: ReactNode;
};

export function ConfirmDialog({
	open,
	title,
	description,
	helpText,
	confirmLabel = "Confirmar",
	cancelLabel = "Cancelar",
	onCancel,
	onConfirm,
	confirmDisabled = false,
}: PropsWithChildren<ConfirmDialogProps>) {
	if (!open) {
		return null;
	}

	return createPortal(
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
			<div className='max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl'>
				<h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
				{description ? (
					<p className='mt-2 text-sm text-gray-600'>{description}</p>
				) : null}
				{helpText ? (
					<div className='mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700'>
						{helpText}
					</div>
				) : null}
				<div className='mt-6 flex justify-end gap-2'>
					<button
						type='button'
						onClick={onCancel}
						className='inline-flex items-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100'>
						{cancelLabel}
					</button>
					<button
						type='button'
						onClick={onConfirm}
						disabled={confirmDisabled}
						className='inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60'>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
