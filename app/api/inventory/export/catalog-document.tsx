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
	description?: string;
	imageUrl?: string | null;
	unitPriceLabel: string;
	totalPriceLabel: string;
	quantityLabel: string;
};

export type CatalogDocumentProps = {
	products: CatalogEntry[];
	exportedDateLabel: string;
};

const styles = StyleSheet.create({
	page: {
		padding: 32,
		backgroundColor: "#f8f1f4",
	},
	header: {
		marginBottom: 24,
		display: "flex",
		flexDirection: "column",
		gap: 6,
	},
	title: {
		fontSize: 22,
		fontWeight: 700,
		color: "#8b1f4a",
	},
	subtitle: {
		fontSize: 11,
		color: "#6b4b57",
	},
	gallery: {
		display: "flex",
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	card: {
		width: "48%",
		marginBottom: 18,
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: "#ffffff",
		border: "1 solid #f2d7e1",
		shadowColor: "#8b1f4a",
		shadowOpacity: 0.12,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
	},
	imageBox: {
		height: 170,
		backgroundColor: "#fef6f9",
		justifyContent: "center",
		alignItems: "center",
	},
	image: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	placeholderText: {
		fontSize: 12,
		color: "#c58aa7",
	},
	cardBody: {
		padding: 14,
		gap: 10,
	},
	name: {
		fontSize: 14,
		fontWeight: 700,
		color: "#4a1831",
	},
	description: {
		fontSize: 11,
		color: "#6f4d5d",
		lineHeight: 1.4,
	},
	priceRow: {
		display: "flex",
		flexDirection: "column",
		gap: 4,
		marginTop: 8,
	},
	priceLabel: {
		fontSize: 10,
		textTransform: "uppercase",
		color: "#b46a88",
		letterSpacing: 1,
	},
	priceValue: {
		fontSize: 14,
		fontWeight: 700,
		color: "#9a1c4f",
	},
	footer: {
		marginTop: 24,
		paddingTop: 12,
		borderTop: "1 solid #f2d7e1",
		fontSize: 10,
		color: "#6b4b57",
		textAlign: "center",
	},
	emptyState: {
		marginTop: 60,
		textAlign: "center",
		fontSize: 14,
		color: "#9a1c4f",
	},
	quantityLabel: {
		fontSize: 10,
		color: "#b46a88",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	quantityValue: {
		fontSize: 12,
		fontWeight: 600,
		color: "#4a1831",
	},
});

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
						Selección de productos activos presentada como álbum para tus
						clientes.
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
						{products.map((product) => (
							<View key={product.id} style={styles.card}>
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
									<View style={styles.priceRow}>
										<Text style={styles.quantityLabel}>
											Cantidad disponible
										</Text>
										<Text style={styles.quantityValue}>
											{product.quantityLabel}
										</Text>
										<Text style={styles.priceLabel}>Precio unitario</Text>
										<Text style={styles.priceValue}>
											{product.unitPriceLabel}
										</Text>
										<Text style={styles.priceLabel}>Total inventario</Text>
										<Text style={styles.priceValue}>
											{product.totalPriceLabel}
										</Text>
									</View>
								</View>
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
