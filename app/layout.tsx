import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/components/storefront/cart-context";

const displayFont = Playfair_Display({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-display",
});

const bodyFont = Plus_Jakarta_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-body",
});

export const metadata: Metadata = {
	title: "Inventario Girlee",
	description:
		"Belleza consciente y experiencias boutique diseñadas para consentirte.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='es' className={`${bodyFont.variable} ${displayFont.variable}`}>
			<body className='antialiased bg-page text-gray-900'>
				<CartProvider>{children}</CartProvider>
			</body>
		</html>
	);
}
