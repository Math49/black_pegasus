"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Liste qui défile horizontalement sur petit écran ; au montage, l'élément actif
 * (`aria-current`) est centré dans la rangée sans faire défiler la page.
 */
export function RangeeDefilante({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const liste = ref.current;
    const actif = liste?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!liste || !actif || liste.scrollWidth <= liste.clientWidth) return;
    liste.scrollLeft = actif.offsetLeft - (liste.clientWidth - actif.offsetWidth) / 2;
  }, []);
  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
