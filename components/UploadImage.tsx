"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

type UploadImageProps = {
	name: string;
	label?: string;
	accept?: string;
	helperText?: string;
	error?: string;
	disabled?: boolean;
	defaultPreview?: string | null;
	onFileChange?: (file: File | null) => void;
};

export function UploadImage({
	name,
	label = "Imagen",
	accept = "image/*",
	helperText,
	error,
	disabled,
	defaultPreview = null,
	onFileChange,
}: UploadImageProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(defaultPreview);

	useEffect(() => {
		setPreviewUrl(defaultPreview);
	}, [defaultPreview]);

	useEffect(() => {
		return () => {
			if (previewUrl && previewUrl.startsWith("blob:")) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const autoId = useId();
	const inputId = `${name}-${autoId.replace(/:/g, "")}`;

	return (
		<div className='flex flex-col gap-2'>
			<label htmlFor={inputId} className='text-sm font-medium text-gray-700'>
				{label}
			</label>
			<div className='flex items-start gap-4'>
				<div className='relative h-32 w-32 overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50'>
					{previewUrl ? (
						<Image
							src={previewUrl}
							alt='Vista previa'
							fill
							className='object-cover'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
							Sin imagen
						</div>
					)}
				</div>
				<div className='flex flex-1 flex-col gap-2'>
					<input
						id={inputId}
						name={name}
						type='file'
						accept={accept}
						disabled={disabled}
						className='block w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60'
						onChange={(event) => {
							const file = event.target.files?.[0] ?? null;
							if (file) {
								const url = URL.createObjectURL(file);
								setPreviewUrl(url);
							} else {
								setPreviewUrl(defaultPreview);
							}
							onFileChange?.(file);
						}}
					/>
					{helperText && <p className='text-xs text-gray-500'>{helperText}</p>}
					{error && <p className='text-xs text-red-500'>{error}</p>}
				</div>
			</div>
		</div>
	);
}
