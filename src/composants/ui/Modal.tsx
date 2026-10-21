"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/classes";
import { IconButton } from "./Button";
import { CadreIcone } from "./Chip";
import type { NomIcone } from "./Icon";

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
  pied,
  icone,
  decoupee = false,
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
  /** Mention à gauche des actions (« Saisi par … »). */
  pied?: ReactNode;
  /** Icône dorée encadrée à gauche du titre (maquette 20). */
  icone?: NomIcone;
  /** En-tête, corps et actions séparés par des filets (maquette 13). */
  decoupee?: boolean;
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
      className={cx("bp-modale", decoupee && "bp-modale--decoupee", className)}
      style={largeur ? { width: `min(${largeur}px, calc(100vw - 32px))` } : undefined}
    >
      {ouvert && (
        <div className="bp-modale__corps">
          <div className="bp-modale__entete">
            <div className="flex items-center gap-4">
              {icone && <CadreIcone icone={icone} taille={52} />}
              <div className="flex flex-col gap-2">
                {surtitre && (
                  <span className="libelle text-[10.5px] tracking-[0.2em]">{surtitre}</span>
                )}
                <h2 id={idTitre} className="m-0 titre text-[24px] font-semibold">
                  {titre}
                </h2>
              </div>
            </div>
            <IconButton libelle="Fermer" icone="fermer" onClick={onFermer} />
          </div>
          {decoupee ? <div className="bp-modale__contenu">{children}</div> : children}
          {actions && (
            <div className={cx("bp-modale__actions", pied ? "bp-modale__actions--pied" : null)}>
              {pied}
              <div className="flex flex-wrap gap-3">{actions}</div>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
