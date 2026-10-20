import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BarreLaterale, BarreLateraleSquelette } from "@/composants/admin/BarreLaterale";
import { FONDS } from "@/composants/site/Mise";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Black Pégasus" },
  robots: { index: false, follow: false },
};

const noir = (p: number) => `color-mix(in srgb, var(--bp-black) ${p}%, transparent)`;

// Gabarit du panel : bg-skyline flouté en plein écran, barre latérale + contenu (HANDOFF § 2 et § 5).
export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-noir">
      <div aria-hidden="true" className="pointer-events-none fixed -inset-[60px]">
        <Image
          src={FONDS.skyline}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{
            objectPosition: "center 70%",
            filter: "blur(30px) brightness(.34) saturate(.9)",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(70% 50% at 75% 0%, color-mix(in srgb, var(--bp-gold-3) 10%, transparent), transparent 60%), linear-gradient(180deg, ${noir(30)}, ${noir(75)})`,
        }}
      />
      <div className="relative flex flex-wrap items-start gap-5 p-5">
        <Suspense fallback={<BarreLateraleSquelette />}>
          <BarreLaterale />
        </Suspense>
        <main id="contenu" className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          {children}
        </main>
      </div>
    </div>
  );
}
