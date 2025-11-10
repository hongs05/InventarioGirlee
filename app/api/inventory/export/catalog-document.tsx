import {
	Document,
	Page,
	View,
	Text,
	Image,
	StyleSheet,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";

export type CatalogEntry = {
	id: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	priceLabel: string;
	hasSalePrice: boolean;
};

type CatalogDocumentProps = {
	products: CatalogEntry[];
	exportedDateLabel: string;
};

export function CatalogDocument({
	products,
	exportedDateLabel,
}: CatalogDocumentProps): ReactElement {
	return (
		<Document title='Catálogo de Inventario'>
			<Page size='A4' style={styles.page} wrap>
				<View style={styles.header}>
					<Text style={styles.title}>Catálogo de Inventario</Text>
					<Text style={styles.subtitle}>
						Selección curada de tus productos destacados.
					</Text>
					<Text style={styles.subtitle}>
						Actualizado el {exportedDateLabel}
					</Text>
				</View>

				{products.length === 0 ? (
					<Text style={styles.emptyState}>
						Tu catálogo aún no tiene productos activos para mostrar.
					</Text>
				) : (
					<View style={styles.gallery}>
						{chunkProducts(products, 3).map((row, rowIndex) => (
							<View key={`row-${rowIndex}`} style={getRowStyles(row.length)}>
								{row.map((product, productIndex) => {
									const cardStyle = buildCardStyle(row.length, productIndex);
									const priceText = product.hasSalePrice
										? product.priceLabel
										: "Sin precio asignado";
									const priceStyle = product.hasSalePrice
										? styles.priceValue
										: [styles.priceValue, styles.pricePlaceholder];

									return (
										<View key={product.id} style={cardStyle}>
											<View style={styles.imageBox}>
												{product.imageUrl ? (
													// eslint-disable-next-line jsx-a11y/alt-text -- React PDF doesn't support alt prop
													<Image
														source={{ uri: product.imageUrl }}
														style={styles.image}
													/>
												) : (
													<Text style={styles.placeholderText}>Sin imagen</Text>
												)}
											</View>
											<View style={styles.cardBody}>
												<Text style={styles.name}>{product.name}</Text>
												{product.description ? (
													<Text style={styles.description}>
														{product.description}
													</Text>
												) : null}
												<View style={styles.priceTag}>
													<Text style={styles.priceLabel}>Precio de venta</Text>
													<Text style={priceStyle}>{priceText}</Text>
												</View>
											</View>
										</View>
									);
								})}
							</View>
						))}
					</View>
				)}

				<View style={styles.footer}>
					<Text>
						Inventario Girlee · Comparte este catálogo elegante con tus clientes
						y asegura experiencias memorables.
					</Text>
				</View>
			</Page>
		</Document>
	);
}

function getRowStyles(length: number) {
	return length < 3 ? [styles.row, styles.rowCompact] : [styles.row];
}

function chunkProducts<T>(items: T[], chunkSize: number): T[][] {
	const result: T[][] = [];
	for (let index = 0; index < items.length; index += chunkSize) {
		result.push(items.slice(index, index + chunkSize));
	}
	return result;
}

function buildCardStyle(rowLength: number, index: number) {
	const cardBase = {
		...styles.card,
		...(rowLength === 1 ? styles.cardFull : {}),
		...(rowLength === 2 ? styles.cardWide : {}),
		...(index === rowLength - 1 ? styles.cardLastInRow : {}),
	};
	return cardBase as (typeof styles)["card"];
}

const styles = StyleSheet.create({
	page: {
		backgroundColor: "#ffffff",
		padding: 24,
		fontFamily: "Helvetica",
	},
	header: {
		marginBottom: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: 700,
		color: "#111827",
	},
	subtitle: {
		fontSize: 11,
		color: "#6b7280",
		marginTop: 2,
	},
	emptyState: {
		marginTop: 40,
		textAlign: "center",
		fontSize: 12,
		color: "#6b7280",
	},
	gallery: {
		flexDirection: "column",
	},
	row: {
		flexDirection: "row",
		marginBottom: 12,
	},
	rowCompact: {
		justifyContent: "flex-start",
	},
	card: {
		flex: 1,
		flexDirection: "column",
		backgroundColor: "#f9fafb",
		borderRadius: 8,
		padding: 10,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		marginRight: 12,
		marginBottom: 12,
	},
	cardFull: {
		width: "100%",
	},
	cardWide: {
		flex: 1,
		minWidth: "45%",
	},
	cardLastInRow: {
		marginRight: 0,
	},
	imageBox: {
		height: 120,
		borderRadius: 6,
		backgroundColor: "#eef2ff",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 8,
	},
	image: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		borderRadius: 6,
	},
	placeholderText: {
		fontSize: 10,
		color: "#9ca3af",
	},
	cardBody: {
		paddingHorizontal: 2,
	},
	name: {
		fontSize: 13,
		fontWeight: 600,
		color: "#111827",
	},
	description: {
		fontSize: 10,
		color: "#4b5563",
		lineHeight: 1.4,
		marginTop: 4,
	},
	priceTag: {
		marginTop: 10,
		paddingVertical: 6,
		paddingHorizontal: 8,
		borderRadius: 6,
		backgroundColor: "#ecfdf5",
		borderWidth: 1,
		borderColor: "#d1fae5",
	},
	priceLabel: {
		fontSize: 9,
		textTransform: "uppercase",
		letterSpacing: 1,
		color: "#047857",
	},
	priceValue: {
		fontSize: 12,
		fontWeight: 600,
		color: "#111827",
	},
	pricePlaceholder: {
		color: "#9ca3af",
		fontWeight: 400,
	},
	footer: {
		marginTop: "auto",
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
		paddingTop: 12,
		fontSize: 9,
		color: "#9ca3af",
		textAlign: "center",
	},
});
