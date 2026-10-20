import type { Metadata } from "next";
import { variablesPolices } from "./polices";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Pégasus – American Transports",
  description: "Location de bateaux, d’avions et d’hélicoptères à San Andreas.",
  icons: { icon: "/images/bp-logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={variablesPolices}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
