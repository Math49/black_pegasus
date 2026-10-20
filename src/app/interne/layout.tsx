import type { Metadata } from "next";
import "./pdf.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Pages imprimées par le service PDF (accès par jeton interne uniquement).
export default function LayoutInterne({ children }: { children: React.ReactNode }) {
  return children;
}
