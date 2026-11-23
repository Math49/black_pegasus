import type { ReactNode, SVGProps } from "react";
import { cx } from "@/lib/classes";

// Icônes au trait des maquettes (grille 24, bouts arrondis). Couleur : currentColor.
const TRACES = {
  telephone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  ),
  flecheDroite: <path d="M5 12h14M13 6l6 6-6 6" />,
  flecheGauche: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronBas: <path d="M6 9l6 6 6-6" />,
  chevronDroite: <path d="M9 6l6 6-6 6" />,
  chevronGauche: <path d="M15 6l-6 6 6 6" />,
  recherche: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  personne: (
    <>
      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.5" />
    </>
  ),
  personnes: (
    <>
      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.5" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3M15.5 4.7a3.5 3.5 0 0 1 0 6.6" />
    </>
  ),
  colis: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  bateau: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v14M5 12H3a9 9 0 0 0 18 0h-2M8 10h8" />
    </>
  ),
  avion: (
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
  ),
  helicoptere: (
    <>
      <path d="M3 4h16M11 4v3" />
      <path d="M6 11a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v2a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3z" />
      <path d="M6 12H2M9 19h10M12 15v4M16 15v4" />
    </>
  ),
  bouclier: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />,
  bouclierValide: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  horloge: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendrier: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  tableauDeBord: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </>
  ),
  solde: (
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M21 9h-6a3 3 0 0 0 0 6h6z" />
    </>
  ),
  contrat: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M12 12v6M9 15l3 3 3-3" />
    </>
  ),
  balance: (
    <>
      <path d="M12 3v18M7 21h10M5 7h14" />
      <path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
    </>
  ),
  siteExterne: (
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  ),
  deconnexion: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />,
  cloche: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  cadenas: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  cadenasOuvert: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </>
  ),
  crayon: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  corbeille: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  reglages: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  moins: <path d="M5 12h14" />,
  fermer: <path d="M6 6l12 12M18 6L6 18" />,
  valider: <path d="M5 12l5 5 9-10" />,
  alerte: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  information: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  entree: <path d="M17 7L7 17M7 9v8h8" />,
  sortie: <path d="M7 17L17 7M9 7h8v8" />,
  hausse: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  baisse: <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />,
  televerser: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  trombone: (
    <path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3L15 7.5" />
  ),
  lien: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  plusOptions: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  envoyer: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  telecharger: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  etiquette: (
    <>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  couches: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  /** Marteau d'enchère. */
  marteau: (
    <>
      <path d="M13 3.5l7.5 7.5M10.5 6l7.5 7.5M12 4.8l-4.2 4.2a1 1 0 0 0 0 1.4l4.8 4.8a1 1 0 0 0 1.4 0l4.2-4.2" />
      <path d="M10.2 12.6l-6.4 6.4a1.4 1.4 0 0 0 2 2l6.4-6.4M3 21h8" />
    </>
  ),
  /** Poignée de glisser-déposer (six points). */
  poignee: <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" strokeWidth={3} />,
  diplome: (
    <>
      <path d="M10 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
      <path d="M7 8h10M7 11h4M18 15a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM13.5 17.6V21l1.5-1 1.5 1v-3.4" />
    </>
  ),
  discussion: (
    <>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
      <path d="M9 11h.01M15 11h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type NomIcone = keyof typeof TRACES;
export const NOMS_ICONES = Object.keys(TRACES) as NomIcone[];

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  nom: NomIcone;
  /** Côté en pixels (20 par défaut). */
  taille?: number;
  /** Épaisseur du trait (1,5 site, 1,6 panel). */
  trait?: number;
  /** Texte alternatif ; sans lui l'icône est décorative. */
  titre?: string;
};

export function Icon({ nom, taille = 20, trait = 1.6, titre, className, ...reste }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      strokeWidth={trait}
      className={cx("bp-ico", className)}
      aria-hidden={titre ? undefined : true}
      role={titre ? "img" : undefined}
      aria-label={titre}
      focusable="false"
      {...reste}
    >
      {TRACES[nom]}
    </svg>
  );
}
