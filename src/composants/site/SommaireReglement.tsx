"use client";

import { useEffect, useState } from "react";

/** Sommaire collant du règlement : l'article en cours de lecture est mis en avant. */
export function SommaireReglement({ titres }: { titres: string[] }) {
  const [actif, setActif] = useState(0);

  useEffect(() => {
    let image = 0;
    const calculer = () => {
      image = 0;
      const seuil = window.innerHeight * 0.3;
      let indice = 0;
      titres.forEach((_, i) => {
        const section = document.getElementById(`art-${i + 1}`);
        if (section && section.getBoundingClientRect().top <= seuil) indice = i;
      });
      // En bas de page, le dernier article est actif même s'il est court.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2)
        indice = titres.length - 1;
      setActif(indice);
    };
    const auDefilement = () => {
      if (!image) image = requestAnimationFrame(calculer);
    };
    calculer();
    window.addEventListener("scroll", auDefilement, { passive: true });
    window.addEventListener("resize", auDefilement);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", auDefilement);
      window.removeEventListener("resize", auDefilement);
    };
  }, [titres]);

  return (
    <nav aria-label="Sommaire" className="flex flex-col gap-1">
      {titres.map((titre, i) => (
        <a
          key={i}
          href={`#art-${i + 1}`}
          className="bp-sommaire-lien"
          aria-current={i === actif ? "location" : undefined}
        >
          <span className="bp-sommaire-lien__num">{String(i + 1).padStart(2, "0")}</span>
          {titre}
        </a>
      ))}
    </nav>
  );
}
