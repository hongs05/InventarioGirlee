const DEFAULT_MAX_LENGTH = 80;

export function slugify(
	input: string,
	options?: { maxLength?: number; preserveCase?: boolean },
) {
	const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
	const preserveCase = options?.preserveCase ?? false;

	const normalized = input
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^\p{Letter}\p{Number}]+/gu, "-")
		.replace(/^-+|-+$/g, "");

	const base = preserveCase ? normalized : normalized.toLowerCase();

	if (base.length <= maxLength) {
		return base;
	}

	return base.substring(0, maxLength).replace(/-+$/g, "");
}

export function safeFilename(name: string, fallback = "file") {
	const slug = slugify(name, { maxLength: 140 });
	return slug.length > 0 ? slug : fallback;
}
