import Image from "next/image";

// Page provisoire (phase 0) : remplacée par l'accueil en phase 4.
export default function Accueil() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-noir px-5 text-center">
      <Image
        src="/images/bp-logo.png"
        alt="Logo Black Pégasus – American Transports"
        width={220}
        height={220}
        priority
        className="h-[220px] w-[220px] object-contain"
      />
      <div className="flex flex-col items-center gap-3">
        <h1 className="m-0 texte-or mot-symbole text-[clamp(28px,4vw,44px)]">BLACK PÉGASUS</h1>
        <span className="text-[11px] font-bold tracking-[0.32em] text-texte-attenue">
          AMERICAN TRANSPORTS
        </span>
      </div>
      <div className="filet-or w-full max-w-[420px]" />
      <p className="m-0 max-w-[480px] text-[17px] leading-[1.75] text-texte-doux">
        Site en préparation.
      </p>
    </main>
  );
}
