"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/classes";
import { IconButton } from "./Button";

/**
 * Modale sur `<dialog>` natif : piège du focus, Échap et retour du focus gérés par le
 * navigateur. Le fond (`::backdrop`) assombrit et floute la page.
 */
export function Modal({
  ouvert,
  onFermer,
  titre,
  surtitre,
  children,
  actions,
  largeur,
  className,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: ReactNode;
  surtitre?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** Largeur maximale en pixels (560 par défaut). */
  largeur?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitre = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (ouvert && !dialog.open) dialog.showModal();
    if (!ouvert && dialog.open) dialog.close();
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitre}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFermer(); // clic sur le fond
      }}
      className={cx("bp-modale", className)}
      style={largeur ? { width: `min(${largeur}px, calc(100vw - 32px))` } : undefined}
    >
      {ouvert && (
        <div className="bp-modale__corps">
          <div className="bp-modale__entete">
            <div className="flex flex-col gap-2">
              {surtitre && (
                <span className="libelle text-[10.5px] tracking-[0.2em]">{surtitre}</span>
              )}
              <h2 id={idTitre} className="m-0 titre text-[24px] font-semibold">
                {titre}
              </h2>
            </div>
            <IconButton libelle="Fermer" icone="fermer" onClick={onFermer} />
          </div>
          {children}
          {actions && <div className="bp-modale__actions">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
