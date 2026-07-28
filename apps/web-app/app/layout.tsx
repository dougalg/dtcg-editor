import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "DTCG Editor",
	description: "Editor for DTCG design token files",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
