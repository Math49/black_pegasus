import type { Metadata } from "next";
import { variablesPolices } from "./polices";
import "./globals.css";

export const metadata: Metadata = {
  // Adresse publique (AUTH_URL) pour les liens absolus Open Graph.
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: { default: "Black Pégasus Compagnie", template: "%s · Black Pégasus" },
  icons: { icon: "/images/logos/bp-compagnie.webp" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "Black Pégasus Compagnie" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={variablesPolices}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
