import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { safeFilename } from "@/lib/slug";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Storage helpers accept any Supabase client instance.
type AnySupabaseClient = SupabaseClient<any>;

type UploadResult = {
	path: string;
	publicUrl: string;
};

function resolveExtension(file: File): string {
	const ext = extname(file.name);
	if (ext) return ext.toLowerCase();

	switch (file.type) {
		case "image/png":
			return ".png";
		case "image/webp":
			return ".webp";
		case "image/gif":
			return ".gif";
		default:
			return ".jpg";
	}
}

export async function uploadImageToBucket(
	client: AnySupabaseClient,
	bucket: string,
	file: File,
	slugSource: string,
): Promise<UploadResult> {
	const buffer = Buffer.from(await file.arrayBuffer());
	const extension = resolveExtension(file);
	const objectPath = `${randomUUID()}-${safeFilename(slugSource)}${extension}`;

	const { error } = await client.storage
		.from(bucket)
		.upload(objectPath, buffer, {
			contentType: file.type || "image/jpeg",
			cacheControl: "3600",
			upsert: false,
		});

	if (error) {
		throw new Error(error.message || "No pudimos subir la imagen");
	}

	const {
		data: { publicUrl },
	} = client.storage.from(bucket).getPublicUrl(objectPath);

	return { path: objectPath, publicUrl };
}

export async function deleteImageFromBucket(
	client: AnySupabaseClient,
	bucket: string,
	publicUrl: string | null | undefined,
) {
	if (!publicUrl) return;

	const marker = `/storage/v1/object/public/${bucket}/`;
	const index = publicUrl.indexOf(marker);
	if (index === -1) return;

	const objectPath = publicUrl.substring(index + marker.length);
	if (!objectPath) return;

	await client.storage.from(bucket).remove([objectPath]);
}
