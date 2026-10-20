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

/** Carte véhicule du site (`.vcard`) : photo, disponibilité, prix heure (or) et jour (argent). */
export function CarteVehicule({
  vehicule: v,
  disponibilite,
  hauteurPhoto = 190,
  titre: Titre = "h3",
  className,
}: {
  vehicule: VehiculeCarte;
  disponibilite: Disponibilite;
  hauteurPhoto?: number;
  titre?: "h2" | "h3";
  className?: string;
}) {
  const complet = disponibilite.libres === 0;
  return (
    <Link
      href={`/flotte/${v.slug}`}
      className={cx("bp-vcard", complet && "bp-vcard--complet", className)}
    >
      <div className="bp-vcard__media" style={{ height: hauteurPhoto }}>
        <Image
          src={v.photoUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 440px"
          className="bp-vcard__photo"
        />
        <div className="bp-vcard__fondu" aria-hidden="true" />
        <Badge disponibilite={disponibilite} className="absolute bottom-[14px] left-[18px]" />
      </div>
      <div className="flex flex-col gap-4 px-[22px] pt-4 pb-[22px]">
        <div className="flex flex-col gap-[5px]">
          <span className="libelle">
            {libelleType(v.type)} · {v.categorie}
          </span>
          <Titre className="m-0 titre text-[22px] font-semibold">{v.nom}</Titre>
        </div>
        <Rule />
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-baseline gap-[5px]">
            <span className="texte-or text-[30px] font-extrabold chiffres">
              {formaterDollars(v.prixHeure)}
            </span>
            <span className="text-[12.5px] text-texte-attenue">/ h</span>
          </span>
          <span className="flex items-baseline gap-[5px]">
            <span className="texte-argent text-[19px] font-bold chiffres">
              {formaterDollars(v.prixJour)}
            </span>
            <span className="text-[12.5px] text-texte-attenue">/ jour</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip>{formaterPlaces(v.places)}</Chip>
          <Chip>{formaterContenance(v.contenanceKg)}</Chip>
        </div>
      </div>
    </Link>
  );
}
