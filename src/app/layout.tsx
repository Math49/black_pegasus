import type { Metadata } from "next";
import { variablesPolices } from "./polices";
import "./globals.css";

export const metadata: Metadata = {
  // Adresse publique (AUTH_URL) pour les liens absolus Open Graph.
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: { default: "Black Pégasus – American Transports", template: "%s · Black Pégasus" },
  description: "Location de bateaux, d’avions et d’hélicoptères à San Andreas.",
  icons: { icon: "/images/bp-logo.png" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "Black Pégasus – American Transports" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={variablesPolices}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
