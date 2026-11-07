import { Suspense } from "react";
import { notFound } from "next/navigation";
import { lireFiliale } from "@/services/site";

async function SectionLocation({ children }: { children: React.ReactNode }) {
  const filiale = await lireFiliale("BPL");
  if (!filiale.visible) notFound();
  return <div data-filiale="location">{children}</div>;
}

export default function LayoutLocation({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SectionLocation>{children}</SectionLocation>
    </Suspense>
  );
}
