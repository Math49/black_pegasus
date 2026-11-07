import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function BarreSite({ filiale, children }: { filiale?: string; children: ReactNode }) {
  return (
    <div
      data-filiale={filiale}
      className="glass-site flex flex-wrap items-center justify-between gap-x-7 gap-y-4 rounded-[28px] py-2.5 pr-3 pl-[18px] lg:rounded-full"
    >
      {children}
    </div>
  );
}

export function LogoSite({ nom, logo, href }: { nom: string; logo: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 text-texte">
      <Image
        src={logo}
        alt=""
        width={46}
        height={46}
        priority
        className="rounded-full object-contain"
      />
      <span className="flex flex-col gap-[3px]">
        <span className="max-w-[160px] texte-or mot-symbole text-sm sm:max-w-[220px]">{nom}</span>
        <span className="sr-only">– Accueil</span>
      </span>
    </Link>
  );
}
