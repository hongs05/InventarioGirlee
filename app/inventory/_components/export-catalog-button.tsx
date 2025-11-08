"use client";

import { useState, useTransition } from "react";

export function ExportCatalogButton() {
	const [isPending, startTransition] = useTransition();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleDownload = () => {
		setErrorMessage(null);
		startTransition(async () => {
			try {
				const response = await fetch("/api/inventory/export", {
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error("No pudimos generar el PDF del inventario");
				}

				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				const timestamp = new Date()
					.toISOString()
					.slice(0, 10)
					.replace(/-/g, "");

				anchor.href = url;
				anchor.download = `catalogo-inventario-${timestamp}.pdf`;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				URL.revokeObjectURL(url);
			} catch (error) {
				if (error instanceof Error) {
					setErrorMessage(error.message);
				} else {
					setErrorMessage("Ocurrió un error inesperado al exportar el PDF.");
				}
			}
		});
	};

	return (
		<div className='flex flex-col items-end gap-1'>
			<button
				type='button'
				onClick={handleDownload}
				disabled={isPending}
				className='inline-flex items-center rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60'>
				{isPending ? "Generando PDF…" : "Exportar catálogo PDF"}
			</button>
			{errorMessage ? (
				<p className='text-xs text-red-600'>{errorMessage}</p>
			) : null}
		</div>
	);
}
