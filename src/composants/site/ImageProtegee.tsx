"use client";

import type { ReactNode } from "react";

/**
 * Dissuade la copie d'un visuel : pas de menu contextuel (« Ouvrir l'image dans un nouvel
 * onglet », « Copier l'image »), pas de glisser-déposer ni de sélection, et un calque
 * transparent posé au-dessus de l'image. La vraie protection reste le filigrane incrusté.
 */
export function ImageProtegee({ children }: { children: ReactNode }) {
  return (
    <div
      className="bp-image-protegee absolute inset-0"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
      <span aria-hidden="true" className="absolute inset-0 z-[1]" />
    </div>
  );
}
