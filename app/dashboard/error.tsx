"use client";

import { useEffect } from "react";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className='space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-destructive-foreground'>
			<div>
				<h2 className='text-xl font-semibold'>
					No pudimos cargar el dashboard
				</h2>
				<p className='mt-2 text-sm text-destructive-foreground/80'>
					{error.message ||
						"Ocurrió un error inesperado al obtener los datos de tu inventario."}
				</p>
			</div>
			<button
				type='button'
				onClick={() => reset()}
				className='inline-flex items-center gap-2 rounded-md bg-blush-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blush-400'>
				Reintentar
			</button>
		</div>
	);
}
