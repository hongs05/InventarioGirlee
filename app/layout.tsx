import type { Metadata } from "next";
import "./globals.css";

import { CartProvider } from "@/components/storefront/cart-context";

export const metadata: Metadata = {
	title: "Inventario Girlee - Next.js + Supabase Boilerplate",
	description: "A modern Next.js boilerplate with Supabase authentication",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className='antialiased'>
				<CartProvider>{children}</CartProvider>
			</body>
		</html>
	);
}
