import Image from "next/image";
import Link from "next/link";
import { formaterDollars } from "@/domaine/argent";
import type { Disponibilite } from "@/domaine/disponibilite";
import type { TypeVehicule } from "@/domaine/types";
import { formaterContenance, formaterPlaces, libelleType } from "@/domaine/unites";
import { cx } from "@/lib/classes";
import { Badge } from "../ui/Badge";
import { Chip } from "../ui/Chip";
import { Rule } from "../ui/Rule";

export type VehiculeCarte = {
  slug: string;
  nom: string;
  type: TypeVehicule;
  categorie: string;
  prixHeure: number;
  prixJour: number;
  places: number;
  contenanceKg: number;
  photoUrl: string;
};

/** Valeurs exactes des maquettes : 01 (accueil), 02 (flotte), 03 (similaires), 05 (référence). */
const FORMATS = {
  accueil: {
    photo: 220,
    corps: "gap-[18px] px-6 pt-[18px] pb-6",
    titre: "text-[24px]",
    heure: "text-[34px]",
    jour: "text-[21px]",
    unite: "/ heure",
    badge: "bottom-4 left-5",
  },
  flotte: {
    photo: 180,
    corps: "gap-4 px-5 pt-4 pb-[22px]",
    titre: "text-[23px]",
    heure: "text-[30px]",
    jour: "text-[18px]",
    unite: "/ h",
    badge: "bottom-[14px] left-[18px]",
  },
  similaire: {
    photo: 200,
    corps: "gap-4 px-6 pt-4 pb-6",
    titre: "text-[22px]",
    heure: "text-[30px]",
    jour: "text-[19px]",
    unite: "/ h",
    badge: "bottom-[14px] left-5",
  },
  reference: {
    photo: 190,
    corps: "gap-4 px-[22px] pt-4 pb-[22px]",
    titre: "text-[22px]",
    heure: "text-[30px]",
    jour: "text-[19px]",
    unite: "/ h",
    badge: "bottom-[14px] left-[18px]",
  },
} as const;

/** Carte véhicule du site (`.vcard`) : photo, disponibilité, prix heure (or) et jour (argent). */
export function CarteVehicule({
  vehicule: v,
  disponibilite,
  format = "reference",
  titre: Titre = "h3",
  className,
}: {
  vehicule: VehiculeCarte;
  disponibilite: Disponibilite;
  format?: keyof typeof FORMATS;
  titre?: "h2" | "h3";
  className?: string;
}) {
  const f = FORMATS[format];
  const complet = disponibilite.libres === 0;
  return (
    <Link
      href={`/flotte/${v.slug}`}
      className={cx("bp-vcard", complet && "bp-vcard--complet", className)}
    >
      <div className="bp-vcard__media" style={{ height: f.photo }}>
        <Image
          src={v.photoUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 440px"
          className="bp-vcard__photo"
        />
        <div className="bp-vcard__fondu" aria-hidden="true" />
        <Badge disponibilite={disponibilite} className={cx("absolute", f.badge)} />
      </div>
      <div className={cx("flex flex-col", f.corps)}>
        <div className="flex flex-col gap-[5px]">
          <span className="libelle">
            {libelleType(v.type)} · {v.categorie}
          </span>
          <Titre className={cx("m-0 titre font-semibold", f.titre)}>{v.nom}</Titre>
        </div>
        <Rule />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
          <span className="flex items-baseline gap-[5px]">
            <span className={cx("texte-or font-extrabold tracking-[-0.01em] chiffres", f.heure)}>
              {formaterDollars(v.prixHeure)}
            </span>
            <span className="text-[12.5px] text-texte-attenue">{f.unite}</span>
          </span>
          <span className="flex items-baseline gap-[5px]">
            <span className={cx("texte-argent font-bold chiffres", f.jour)}>
              {formaterDollars(v.prixJour)}
            </span>
            <span className="text-[12.5px] text-texte-attenue">/ jour</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip icone={format === "reference" ? undefined : "personne"}>
            {formaterPlaces(v.places)}
          </Chip>
          <Chip icone={format === "reference" ? undefined : "colis"}>
            {formaterContenance(v.contenanceKg)}
          </Chip>
        </div>
      </div>
    </Link>
  );
}
