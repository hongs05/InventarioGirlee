#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const process = require("node:process");
const xlsx = require("xlsx");

const COLUMN_ALIASES = {
	sku: [
		"sku",
		"codigo",
		"codigo_tienda",
		"code",
		"item_code",
		"product_code",
		"id",
		"product_id",
	],
	name: ["name", "nombre", "producto", "product_name", "descripcion_corta"],
	description: ["description", "descripcion", "detalle", "product_description"],
	category: ["category", "categoria", "category_name", "familia", "linea"],
	costPrice: [
		"cost",
		"costo",
		"cost_price",
		"precio_costo",
		"unit_cost",
		"precio_a_jeffrey",
	],
	sellPrice: [
		"price",
		"precio",
		"sell_price",
		"precio_venta",
		"precio_publico",
		"precio_tienda",
	],
	currency: ["currency", "moneda"],
	status: ["status", "estado", "activo"],
};

const DEFAULT_CURRENCY = "NIO";
const DEFAULT_STATUS = "active";
const DEFAULT_MARGIN = 0.7;
const INVALID_SKU_VALUES = new Set([
	"",
	"n/a",
	"na",
	"sin codigo",
	"sin código",
	"s/n",
	"n.a",
	"-",
	"?",
	"0",
]);

function parseArgs(argv) {
	const args = {
		file: null,
		outDir: path.resolve(process.cwd(), "inventorymig", "output"),
		categoryMapFile: null,
		currency: DEFAULT_CURRENCY,
	};

	for (const rawArg of argv.slice(2)) {
		const [flag, value] = rawArg.split("=");
		switch (flag) {
			case "--file":
			case "-f":
				args.file = value;
				break;
			case "--out-dir":
				args.outDir = path.resolve(process.cwd(), value);
				break;
			case "--category-map":
				args.categoryMapFile = value;
				break;
			case "--currency":
				args.currency = value;
				break;
			case "--help":
			case "-h":
				printHelp();
				process.exit(0);
			default:
				console.warn(`Unknown argument: ${flag}`);
		}
	}

	if (!args.file) {
		printHelp();
		throw new Error(
			"Missing required --file argument pointing to the spreadsheet.",
		);
	}

	return args;
}

function printHelp() {
	console.log(`Usage: node inventorymig/import-inventory.cjs --file=path/to/inventory.xlsx [--out-dir=inventorymig/output] [--category-map=inventorymig/category-map.json] [--currency=NIO]

Options:
  --file, -f         Absolute or relative path to the Excel/CSV file.
  --out-dir          Directory where CSV and SQL outputs will be written. Defaults to inventorymig/output.
  --category-map     Optional JSON file { "map": { "legacy": "target" }, "defaultCategory": "Maquillaje" }.
  --currency         Override default currency (default: NIO).
`);
}

function normalizeKey(key) {
	return key
		.toString()
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_");
}

function detectCurrencySymbol(value) {
	if (value === undefined || value === null) {
		return null;
	}
	const raw = value.toString();
	if (raw.includes("C$")) {
		return "NIO";
	}
	if (/\$/.test(raw)) {
		return "USD";
	}
	if (/cordob/i.test(raw)) {
		return "NIO";
	}
	if (/usd|dollar/i.test(raw)) {
		return "USD";
	}
	return null;
}

function normalizeCategoryName(name) {
	if (!name) {
		return null;
	}
	const trimmed = `${name}`.trim();
	if (!trimmed) {
		return null;
	}
	const lookup = {
		perfumeria: "Perfumería",
		perfumería: "Perfumería",
		maquillaje: "Maquillaje",
		"cuidado de la piel": "Cuidado de la Piel",
		"cuidado del cabello": "Cuidado del Cabello",
		ropa: "Ropa",
	};
	const normalized = lookup[trimmed.toLowerCase()];
	if (normalized) {
		return normalized;
	}
	return trimmed
		.split(" ")
		.map((segment) =>
			segment.length
				? segment[0].toUpperCase() + segment.slice(1).toLowerCase()
				: "",
		)
		.join(" ");
}

function slugify(text) {
	return text
		.toString()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/(^-|-$)/g, "")
		.toUpperCase();
}

function isInvalidSkuValue(value) {
	if (value === undefined || value === null) {
		return true;
	}
	const normalized = value.toString().trim().toLowerCase();
	return !normalized || INVALID_SKU_VALUES.has(normalized);
}

function makeSku(primary, fallback, used) {
	let candidate = null;
	if (!isInvalidSkuValue(primary)) {
		candidate = slugify(primary);
	}
	if (!candidate && !isInvalidSkuValue(fallback)) {
		candidate = slugify(fallback);
	}
	if (!candidate) {
		candidate = `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
	}
	let resolved = candidate;
	let suffix = 1;
	while (used.has(resolved)) {
		resolved = `${candidate}-${suffix}`;
		suffix += 1;
	}
	used.add(resolved);
	return resolved;
}

function applyMargin(base, margin = DEFAULT_MARGIN) {
	if (base === null || base === undefined) {
		return null;
	}
	const result = base * (1 + margin);
	return Number.isFinite(result) ? Number(result.toFixed(2)) : null;
}

function parseMoney(value) {
	if (value === undefined || value === null) {
		return null;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return Number(value.toFixed(2));
	}
	const numeric = value
		.toString()
		.trim()
		.replace(/[^0-9,.-]/g, "")
		.replace(/,(?=\d{3}(\D|$))/g, "")
		.replace(",", ".");
	if (!numeric || numeric === "." || numeric === "-" || numeric === "-.") {
		return null;
	}
	const parsed = Number(numeric);
	return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function csvEscape(value) {
	if (value === null || value === undefined) {
		return "";
	}
	const stringValue = value.toString();
	if (/[",\n\r]/.test(stringValue)) {
		return '"' + stringValue.replace(/"/g, '""') + '"';
	}
	return stringValue;
}

function sqlLiteral(value) {
	if (value === null || value === undefined) {
		return "null";
	}
	return `'${value.toString().replace(/'/g, "''")}'`;
}

function sqlNumeric(value) {
	if (value === null || value === undefined) {
		return "null";
	}
	return Number(value).toFixed(2);
}

function pickValue(row, field) {
	const aliases = COLUMN_ALIASES[field];
	if (!aliases) {
		return undefined;
	}
	for (const alias of aliases) {
		if (
			alias in row &&
			row[alias] !== undefined &&
			row[alias] !== null &&
			`${row[alias]}`.trim() !== ""
		) {
			return row[alias];
		}
	}
	return undefined;
}

function buildCategoryMapper(config) {
	if (!config) {
		return {
			resolve(name) {
				if (name === undefined || name === null || `${name}`.trim() === "") {
					return null;
				}
				return `${name}`.trim();
			},
			defaultCategory: null,
		};
	}

	const mapEntries = config.map || {};
	const normalized = new Map();
	for (const [source, target] of Object.entries(mapEntries)) {
		normalized.set(source.trim().toLowerCase(), target.trim());
	}
	const defaultCategory = config.defaultCategory
		? config.defaultCategory.trim()
		: null;

	return {
		resolve(name) {
			if (name === undefined || name === null) {
				return defaultCategory;
			}
			const raw = `${name}`.trim();
			if (raw === "") {
				return defaultCategory;
			}
			const mapped = normalized.get(raw.toLowerCase());
			return mapped || raw;
		},
		defaultCategory,
	};
}

function buildMeta(row) {
	const meta = {};

	const brand = row.marca;
	if (brand && `${brand}`.trim() !== "") {
		meta.brand = `${brand}`.trim();
	}

	const storeCode = row.codigo_tienda;
	if (storeCode && `${storeCode}`.trim() !== "") {
		meta.legacy_code = `${storeCode}`.trim();
	}

	const subcategory = row.sub_categoria;
	if (subcategory && `${subcategory}`.trim() !== "") {
		meta.subcategory = `${subcategory}`.trim();
	}

	const quantity = Number.parseInt(row.cantidad, 10);
	if (Number.isFinite(quantity) && quantity > 0) {
		meta.initial_quantity = quantity;
	}

	const condition = row.estado_del_producto;
	if (
		condition &&
		`${condition}`.trim() !== "" &&
		`${condition}`.trim().toLowerCase() !== "n/a"
	) {
		meta.condition = `${condition}`.trim();
	}

	const photo = row.fotografia;
	if (photo && `${photo}`.trim() !== "") {
		meta.source_photo = `${photo}`.trim();
	}

	const storePrice = parseMoney(row.precio_tienda);
	if (storePrice !== null) {
		meta.legacy_store_price = storePrice;
	}

	const total = parseMoney(row.total);
	if (total !== null) {
		meta.legacy_total = total;
	}

	if (row.columna_1 && `${row.columna_1}`.trim() !== "") {
		meta.note_1 = `${row.columna_1}`.trim();
	}
	if (row.columna_2 && `${row.columna_2}`.trim() !== "") {
		meta.note_2 = `${row.columna_2}`.trim();
	}

	return meta;
}

async function loadCategoryMap(filePath) {
	if (!filePath) {
		return null;
	}
	const absolutePath = path.isAbsolute(filePath)
		? filePath
		: path.resolve(process.cwd(), filePath);
	const contents = await fs.readFile(absolutePath, "utf8");
	return JSON.parse(contents);
}

async function main() {
	const options = parseArgs(process.argv);
	const absoluteFilePath = path.isAbsolute(options.file)
		? options.file
		: path.resolve(process.cwd(), options.file);

	const workbook = xlsx.readFile(absoluteFilePath, {
		cellDates: false,
		cellNF: false,
		cellHTML: false,
	});
	const firstSheetName = workbook.SheetNames[0];
	if (!firstSheetName) {
		throw new Error("Spreadsheet does not contain any sheets.");
	}
	const sheet = workbook.Sheets[firstSheetName];
	const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

	if (!rawRows.length) {
		console.warn("No rows found in the provided sheet. Nothing to convert.");
		return;
	}

	const categoryConfig = await loadCategoryMap(options.categoryMapFile);
	const categoryMapper = buildCategoryMapper(categoryConfig);

	const processed = [];
	const warnings = [];
	const usedSkus = new Set();
	const categories = new Set();

	rawRows.forEach((row, index) => {
		const normalizedRow = {};
		for (const [key, value] of Object.entries(row)) {
			normalizedRow[normalizeKey(key)] = value;
		}

		const rawName = pickValue(normalizedRow, "name");
		if (!rawName) {
			warnings.push(`Row ${index + 2}: Missing product name, skipping.`);
			return;
		}

		const rawSku = pickValue(normalizedRow, "sku");
		const fallbackSku = normalizedRow.item_no || rawName;
		const sku = makeSku(rawSku, fallbackSku, usedSkus);

		const categoryName = normalizeCategoryName(
			categoryMapper.resolve(pickValue(normalizedRow, "category")),
		);
		if (categoryName) {
			categories.add(categoryName);
		}

		const rawJeffreyPrice =
			normalizedRow.precio_a_jeffrey ?? pickValue(normalizedRow, "costPrice");
		const costPrice = parseMoney(rawJeffreyPrice);
		if (costPrice === null) {
			warnings.push(
				`Row ${
					index + 2
				}: Missing or invalid "Precio a Jeffrey" for SKU ${sku}, skipping.`,
			);
			return;
		}

		const sellPrice = applyMargin(costPrice, DEFAULT_MARGIN);
		const explicitSellPrice = parseMoney(pickValue(normalizedRow, "sellPrice"));
		const finalSellPrice = sellPrice ?? explicitSellPrice;

		const detectedCurrency =
			detectCurrencySymbol(rawJeffreyPrice) ||
			detectCurrencySymbol(normalizedRow.precio_tienda) ||
			detectCurrencySymbol(pickValue(normalizedRow, "currency"));

		const imagePath = (() => {
			const raw = normalizedRow.fotografia;
			if (raw === undefined || raw === null) {
				return null;
			}
			const trimmed = `${raw}`.trim();
			return trimmed === "" ? null : trimmed;
		})();

		const meta = buildMeta(normalizedRow);

		processed.push({
			sku,
			name: `${rawName}`.trim(),
			description: (() => {
				const value = pickValue(normalizedRow, "description");
				return value === undefined || value === null ? "" : `${value}`.trim();
			})(),
			categoryName,
			costPrice,
			sellPrice: finalSellPrice,
			currency: (() => {
				const explicitCurrency = pickValue(normalizedRow, "currency");
				if (
					explicitCurrency !== undefined &&
					explicitCurrency !== null &&
					`${explicitCurrency}`.trim() !== ""
				) {
					return `${explicitCurrency}`.trim();
				}
				return detectedCurrency || options.currency;
			})(),
			status: (() => {
				const explicitStatus = pickValue(normalizedRow, "status");
				if (
					explicitStatus === undefined ||
					explicitStatus === null ||
					`${explicitStatus}`.trim() === ""
				) {
					return DEFAULT_STATUS;
				}
				const normalized = `${explicitStatus}`.trim().toLowerCase();
				return ["inactive", "archived", "draft"].includes(normalized)
					? "inactive"
					: DEFAULT_STATUS;
			})(),
			imagePath,
			meta,
		});
	});

	if (!processed.length) {
		console.warn("No valid product rows found after processing.");
		if (warnings.length) {
			console.warn("Warnings:");
			warnings.forEach((warn) => console.warn(`  - ${warn}`));
		}
		return;
	}

	await fs.mkdir(options.outDir, { recursive: true });

	const csvHeader =
		"sku,name,description,category_name,cost_price,sell_price,currency,status,image_path,meta\n";
	const csvBody = processed
		.map((product) =>
			[
				csvEscape(product.sku),
				csvEscape(product.name),
				csvEscape(product.description),
				csvEscape(product.categoryName ?? ""),
				csvEscape(product.costPrice ?? ""),
				csvEscape(product.sellPrice ?? ""),
				csvEscape(product.currency ?? ""),
				csvEscape(product.status ?? DEFAULT_STATUS),
				csvEscape(product.imagePath ?? ""),
				csvEscape(JSON.stringify(product.meta ?? {})),
			].join(","),
		)
		.join("\n");
	const csvOutput = csvHeader + csvBody + "\n";

	const sqlValues = processed
		.map((product) => {
			const categoryExpression = product.categoryName
				? `(select id from public.categories where name = ${sqlLiteral(
						product.categoryName,
				  )})`
				: "null";
			return `  (${[
				sqlLiteral(product.sku),
				sqlLiteral(product.name),
				sqlLiteral(product.description || null),
				categoryExpression,
				sqlNumeric(product.costPrice),
				sqlNumeric(product.sellPrice),
				sqlLiteral(product.currency),
				sqlLiteral(product.status),
				sqlLiteral(product.imagePath),
				sqlLiteral(JSON.stringify(product.meta ?? {})),
				"null",
			].join(", ")})`;
		})
		.join(",\n");

	let categorySql = "";
	if (categories.size) {
		const categoryValues = [...categories]
			.map((name) => `  (${sqlLiteral(name)})`)
			.join(",\n");
		categorySql = `insert into public.categories (name)
values
${categoryValues}
on conflict (name) do nothing;

`;
	}

	const sqlOutput = `${categorySql}insert into public.products (sku, name, description, category_id, cost_price, sell_price, currency, status, image_path, meta, created_by)
values
${sqlValues}
on conflict (sku) do update set
  name = excluded.name,
  description = excluded.description,
  category_id = excluded.category_id,
  cost_price = excluded.cost_price,
  sell_price = excluded.sell_price,
  currency = excluded.currency,
  status = excluded.status,
  image_path = excluded.image_path,
  meta = excluded.meta,
  updated_at = now();
`;

	const csvPath = path.join(options.outDir, "products.csv");
	const sqlPath = path.join(options.outDir, "products.sql");

	await fs.writeFile(csvPath, csvOutput, "utf8");
	await fs.writeFile(sqlPath, sqlOutput, "utf8");

	console.log(
		`Processed ${processed.length} products from sheet "${firstSheetName}".`,
	);
	console.log(`CSV written to ${csvPath}`);
	console.log(`SQL written to ${sqlPath}`);

	if (categories.size) {
		console.log("Categories referenced:");
		[...categories].forEach((category) => console.log(`  - ${category}`));
	} else if (categoryMapper.defaultCategory) {
		console.log(
			`All products assigned to default category: ${categoryMapper.defaultCategory}`,
		);
	} else {
		console.log(
			"No category data detected; products will be migrated without category linkage.",
		);
	}

	if (warnings.length) {
		console.log("\nWarnings encountered:");
		warnings.forEach((warn) => console.log(`  - ${warn}`));
	}
}

main().catch((error) => {
	console.error("Migration conversion failed:");
	console.error(error.message || error);
	process.exit(1);
});
