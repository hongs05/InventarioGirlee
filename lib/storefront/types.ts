export type StorefrontProduct = {
	id: string;
	slug: string;
	name: string;
	brand?: string | null;
	currency: string;
	sellPrice: number | null;
	costPrice?: number | null;
	quantity?: number | null;
	imageUrl?: string | null;
	description?: string | null;
	badges?: string[];
	category?: string | null;
	categoryId?: number | null;
};

export type StorefrontCombo = {
	id: string;
	slug: string;
	name: string;
	description?: string | null;
	suggestedPrice?: number | null;
	packagingCost?: number | null;
	currency?: string | null;
	status?: string | null;
	imageUrl?: string | null;
	badges?: string[];
};

export type StorefrontCategory = {
	id: number;
	name: string;
	productCount?: number;
};
