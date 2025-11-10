import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFImage, PDFPage } from "pdf-lib";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ProductRow = {
	id: string;
	name: string;
	description: string | null;
	sell_price: number | null;
	cost_price: number | null;
	currency: string | null;
	quantity: number | null;
	image_path: string | null;
};

type CatalogEntry = {
	id: string;
	name: string;
	description?: string;
	imageUrl?: string | null;
	priceLabel: string;
	hasSalePrice: boolean;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 36;
const HEADER_HEIGHT = 90;
const FOOTER_HEIGHT = 36;
const NUM_COLUMNS = 3;
const CARD_GAP = 14;
const CARD_WIDTH =
	(A4_WIDTH - PAGE_MARGIN * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_HEIGHT = 230;
const CARD_VERTICAL_GAP = 18;
const CARD_PADDING = 14;
const IMAGE_BOX_HEIGHT = 120;

const COLORS = {
	pageBackground: hexToRgb("#f8f1f4"),
	cardBackground: hexToRgb("#ffffff"),
	cardBorder: hexToRgb("#f2d7e1"),
	imageBackground: hexToRgb("#fef6f9"),
	placeholder: hexToRgb("#c58aa7"),
	title: hexToRgb("#8b1f4a"),
	subtitle: hexToRgb("#6b4b57"),
	name: hexToRgb("#4a1831"),
	description: hexToRgb("#6f4d5d"),
	label: hexToRgb("#b46a88"),
	value: hexToRgb("#9a1c4f"),
	priceBackground: hexToRgb("#f8e3ec"),
	pricePlaceholder: hexToRgb("#a27a8c"),
	footer: hexToRgb("#6b4b57"),
};

function safeNumber(value: unknown, fallback = 0): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveCurrency(code: string | null | undefined): string {
	if (!code || typeof code !== "string" || code.length !== 3) {
		return "NIO";
	}
	return code.toUpperCase();
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(value);
}

function hexToRgb(hex: string) {
	const sanitized = hex.replace("#", "");
	const bigint = parseInt(sanitized, 16);
	const r = ((bigint >> 16) & 255) / 255;
	const g = ((bigint >> 8) & 255) / 255;
	const b = (bigint & 255) / 255;
	return rgb(r, g, b);
}

function ensureAbsoluteUrl(path: string | null | undefined) {
	if (!path) {
		return null;
	}
	if (/^https?:\/\//i.test(path)) {
		return path;
	}
	try {
		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4000";
		return new URL(path, baseUrl).toString();
	} catch {
		return null;
	}
}

async function embedProductImage(
	pdfDoc: PDFDocument,
	url: string | null | undefined,
): Promise<PDFImage | null> {
	const absoluteUrl = ensureAbsoluteUrl(url ?? null);
	if (!absoluteUrl) {
		return null;
	}

	try {
		const response = await fetch(absoluteUrl);
		if (!response.ok) {
			return null;
		}
		const contentType = response.headers.get("content-type") ?? "";
		const imageBytes = new Uint8Array(await response.arrayBuffer());

		if (contentType.includes("png")) {
			return await pdfDoc.embedPng(imageBytes);
		}
		return await pdfDoc.embedJpg(imageBytes);
	} catch (error) {
		console.warn("[inventory export] Unable to embed image", {
			url: absoluteUrl,
			error,
		});
		return null;
	}
}

function wrapText(
	text: string,
	font: PDFFont,
	fontSize: number,
	maxWidth: number,
	maxLines = 5,
) {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return [];
	}

	const words = normalized.split(" ");
	const lines: string[] = [];
	let current = "";

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		const width = font.widthOfTextAtSize(candidate, fontSize);
		if (width <= maxWidth) {
			current = candidate;
			continue;
		}

		if (current) {
			lines.push(current);
		}
		current = word;
		if (lines.length >= maxLines) {
			break;
		}
	}

	if (current && lines.length < maxLines) {
		lines.push(current);
	}

	return lines.slice(0, maxLines);
}

function drawHeader(
	page: PDFPage,
	regularFont: PDFFont,
	boldFont: PDFFont,
	exportedDate: string,
) {
	page.drawRectangle({
		x: 0,
		y: 0,
		width: A4_WIDTH,
		height: A4_HEIGHT,
		color: COLORS.pageBackground,
	});

	const titleY = A4_HEIGHT - PAGE_MARGIN - 10;
	page.drawText("Catálogo de Inventario", {
		x: PAGE_MARGIN,
		y: titleY,
		font: boldFont,
		size: 24,
		color: COLORS.title,
	});

	page.drawText("Selección curada de tus productos destacados.", {
		x: PAGE_MARGIN,
		y: titleY - 24,
		font: regularFont,
		size: 12,
		color: COLORS.subtitle,
	});

	page.drawText(`Actualizado el ${exportedDate}`, {
		x: PAGE_MARGIN,
		y: titleY - 40,
		font: regularFont,
		size: 11,
		color: COLORS.subtitle,
	});

	page.drawText(
		"Inventario Girlee · Comparte este catálogo elegante con tus clientes y asegura experiencias memorables.",
		{
			x: PAGE_MARGIN,
			y: PAGE_MARGIN - 12,
			font: regularFont,
			size: 10,
			color: COLORS.footer,
		},
	);
}

function drawCard(
	page: PDFPage,
	entry: CatalogEntry,
	fonts: { regular: PDFFont; bold: PDFFont },
	position: { x: number; y: number },
	embeddedImage: PDFImage | null,
) {
	const { x, y } = position;
	page.drawRectangle({
		x,
		y: y - CARD_HEIGHT,
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		color: COLORS.cardBackground,
		borderColor: COLORS.cardBorder,
		borderWidth: 1,
	});

	const imageX = x + CARD_PADDING;
	const imageY = y - CARD_PADDING - IMAGE_BOX_HEIGHT;
	const imageWidth = CARD_WIDTH - CARD_PADDING * 2;

	page.drawRectangle({
		x: imageX,
		y: imageY,
		width: imageWidth,
		height: IMAGE_BOX_HEIGHT,
		color: COLORS.imageBackground,
	});

	if (embeddedImage) {
		const scale = Math.min(
			imageWidth / embeddedImage.width,
			IMAGE_BOX_HEIGHT / embeddedImage.height,
		);
		const drawWidth = embeddedImage.width * scale;
		const drawHeight = embeddedImage.height * scale;
		const drawX = imageX + (imageWidth - drawWidth) / 2;
		const drawY = imageY + (IMAGE_BOX_HEIGHT - drawHeight) / 2;
		page.drawImage(embeddedImage, {
			x: drawX,
			y: drawY,
			width: drawWidth,
			height: drawHeight,
		});
	} else {
		page.drawText("Sin imagen", {
			x: imageX + 16,
			y: imageY + IMAGE_BOX_HEIGHT / 2 - 6,
			font: fonts.regular,
			size: 12,
			color: COLORS.placeholder,
		});
	}

	let textY = imageY - 18;
	const textX = x + CARD_PADDING;
	const textWidth = CARD_WIDTH - CARD_PADDING * 2;

	page.drawText(entry.name, {
		x: textX,
		y: textY,
		font: fonts.bold,
		size: 14,
		color: COLORS.name,
	});

	textY -= 16;

	if (entry.description) {
		const lines = wrapText(entry.description, fonts.regular, 11, textWidth);
		for (const line of lines) {
			page.drawText(line, {
				x: textX,
				y: textY,
				font: fonts.regular,
				size: 11,
				color: COLORS.description,
			});
			textY -= 14;
		}
		textY -= 6;
	}

	const priceBoxHeight = 34;
	const priceBoxY = textY - priceBoxHeight + 6;
	page.drawRectangle({
		x: textX,
		y: priceBoxY,
		width: textWidth,
		height: priceBoxHeight,
		color: COLORS.priceBackground,
	});

	page.drawText("Precio de venta", {
		x: textX + 10,
		y: priceBoxY + priceBoxHeight - 14,
		font: fonts.regular,
		size: 10,
		color: COLORS.label,
	});

	const priceText = entry.hasSalePrice
		? entry.priceLabel
		: "Sin precio asignado";

	page.drawText(priceText, {
		x: textX + 10,
		y: priceBoxY + 10,
		font: entry.hasSalePrice ? fonts.bold : fonts.regular,
		size: entry.hasSalePrice ? 14 : 12,
		color: entry.hasSalePrice ? COLORS.value : COLORS.pricePlaceholder,
	});
}

export async function GET() {
	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("products")
		.select(
			"id, name, description, sell_price, cost_price, currency, quantity, image_path",
		)
		.eq("status", "active")
		.order("name", { ascending: true });

	if (error) {
		console.error("[inventory export]", error);
		return NextResponse.json(
			{ error: "No pudimos generar el catálogo." },
			{ status: 500 },
		);
	}

	const exportedDate = new Intl.DateTimeFormat("es-NI", {
		dateStyle: "long",
	}).format(new Date());

	const products: CatalogEntry[] = ((data ?? []) as ProductRow[]).map(
		(product) => {
			const currency = resolveCurrency(product.currency);
			const hasSellPrice =
				product.sell_price !== null && product.sell_price !== undefined;
			const sellPriceValue = hasSellPrice
				? safeNumber(product.sell_price)
				: null;
			const priceLabel = hasSellPrice
				? formatCurrency(sellPriceValue ?? 0, currency)
				: "";

			return {
				id: product.id,
				name: product.name,
				description: product.description?.trim() || undefined,
				imageUrl: product.image_path,
				priceLabel,
				hasSalePrice: hasSellPrice,
			};
		},
	);

	const pdfDoc = await PDFDocument.create();
	const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
	drawHeader(page, regularFont, boldFont, exportedDate);

	let cursorY = A4_HEIGHT - PAGE_MARGIN - HEADER_HEIGHT;
	let column = 0;

	for (const entry of products) {
		if (column === 0 && cursorY - CARD_HEIGHT < PAGE_MARGIN + FOOTER_HEIGHT) {
			page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
			drawHeader(page, regularFont, boldFont, exportedDate);
			cursorY = A4_HEIGHT - PAGE_MARGIN - HEADER_HEIGHT;
			column = 0;
		}

		const positionX = PAGE_MARGIN + column * (CARD_WIDTH + CARD_GAP);
		const embeddedImage = await embedProductImage(
			pdfDoc,
			entry.imageUrl ?? null,
		);
		drawCard(
			page,
			entry,
			{ regular: regularFont, bold: boldFont },
			{ x: positionX, y: cursorY },
			embeddedImage,
		);

		column += 1;
		if (column >= NUM_COLUMNS) {
			column = 0;
			cursorY -= CARD_HEIGHT + CARD_VERTICAL_GAP;
		}
	}

	if (products.length === 0) {
		page.drawText("Tu catálogo aún no tiene productos activos para mostrar.", {
			x: PAGE_MARGIN,
			y: cursorY,
			font: regularFont,
			size: 14,
			color: COLORS.value,
		});
	}

	const pdfBytes = await pdfDoc.save();
	const pdfBuffer = Buffer.from(pdfBytes);

	return new NextResponse(pdfBuffer, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": "attachment; filename=catalogo-inventario.pdf",
			"Cache-Control": "no-store",
		},
	});
}
