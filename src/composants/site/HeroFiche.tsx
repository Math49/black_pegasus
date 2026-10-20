"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/classes";

const noir = (p: number) => `color-mix(in srgb, var(--bp-black) ${p}%, transparent)`;

/**
 * Hero de la fiche véhicule : la photo choisie dans la galerie sert de fond.
 * La galerie n'apparaît que s'il y a plusieurs photos.
 */
export function HeroFiche({
  photos,
  nom,
  decalageHaut,
  children,
}: {
  photos: string[];
  nom: string;
  decalageHaut: number;
  children: ReactNode;
}) {
  const [active, setActive] = useState(0);
  return (
    <section className="relative flex min-h-[788px] flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ top: -decalageHaut }}
      >
        <Image
          src={photos[active]}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "62% 45%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: [
              `linear-gradient(180deg, ${noir(60)}, transparent 180px)`,
              `linear-gradient(180deg, transparent calc(100% - 340px), var(--bp-black))`,
              `linear-gradient(90deg, ${noir(95)} 0%, ${noir(80)} 30%, ${noir(25)} 62%, ${noir(25)} 100%)`,
            ].join(", "),
          }}
        />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-wrap items-end justify-between gap-10 px-[clamp(16px,4vw,56px)] pt-[60px] pb-40">
        {children}
        {photos.length > 1 && (
          <div className="glass-site flex flex-col gap-3 rounded-[20px] bg-[var(--bp-noir-35)] p-3.5">
            <span className="pl-1 libelle text-texte-doux">Galerie · {photos.length} photos</span>
            <div className="flex flex-wrap gap-2.5">
              {photos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  aria-label={`Photo ${i + 1} du ${nom}`}
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  className={cx(
                    "relative block h-16 w-24 cursor-pointer overflow-hidden rounded-controle border bg-surface p-0",
                    i === active
                      ? "border-or-texte shadow-[0_0_0_1px_var(--bp-gold-text)]"
                      : "border-[var(--bp-trait-14)]",
                  )}
                >
                  <Image src={url} alt="" fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
