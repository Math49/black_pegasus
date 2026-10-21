"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/classes";
import { Avatar } from "../../ui/Avatar";
import { Button, IconButton } from "../../ui/Button";
import { DataGrid } from "../../ui/DataGrid";
import { GlassCard } from "../../ui/GlassCard";
import { Icon } from "../../ui/Icon";
import { Statut } from "../../ui/Statut";
import { ModaleMouvement, type MouvementAffiche } from "./ModaleMouvement";
import { ModaleNouveauMouvement, type ContratLiable } from "./ModaleNouveauMouvement";

type Option = { valeur: string; libelle: string };

/** Historique filtrable et paginé de la page Solde (maquette 12), avec ses modales. */
export function HistoriqueMouvements({
  lignes,
  pagination,
  filtres,
  categories,
  periodes,
  nouveau,
}: {
  lignes: MouvementAffiche[];
  pagination: { page: number; pages: number; libelle: string };
  filtres: { q: string; categorie: string; periode: string };
  categories: Option[];
  periodes: Option[];
  nouveau: {
    semaine: number;
    dateParDefaut: string;
    contrats: ContratLiable[];
    acteur: { nom: string; avatarUrl: string | null };
  };
}) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [recherche, setRecherche] = useState(filtres.q);
  // « Nouveau mouvement » du tableau de bord arrive avec ?nouveau=1.
  const [creation, setCreation] = useState(params.get("nouveau") === "1");
  const [selection, setSelection] = useState<MouvementAffiche | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const url = (changements: Record<string, string | number | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changements)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    if (!("page" in changements)) p.delete("page");
    const texte = p.toString();
    return texte ? `${chemin}?${texte}` : chemin;
  };
  const filtrer = (changements: Record<string, string | null>) =>
    router.push(url(changements), { scroll: false });

  const libellePeriode = periodes.find((p) => p.valeur === filtres.periode)?.libelle ?? "";
  return (
    <GlassCard
      as="section"
      variante="admin"
      aria-labelledby="titre-historique"
      className="flex flex-col gap-4 rounded-[24px] px-2 pt-[22px] pb-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3.5 px-3.5">
        <h2 id="titre-historique" className="m-0 titre text-lg font-semibold">
          Historique des mouvements
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <form
            role="search"
            className="bp-champ-cadre w-[240px]"
            onSubmit={(e) => {
              e.preventDefault();
              filtrer({ q: recherche.trim() || null });
            }}
          >
            <Icon nom="recherche" taille={15} />
            <input
              type="search"
              aria-label="Rechercher un mouvement"
              placeholder="Motif, contrat, nom…"
              className="bp-fld bp-fld--panel bp-fld--avec-icone"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                if (e.target.value === "" && filtres.q) filtrer({ q: null });
              }}
            />
          </form>
          {(
            [
              ["categorie", "Catégorie", categories, "w-[206px]"],
              ["periode", "Période", periodes, "w-[218px]"],
            ] as const
          ).map(([cle, libelle, options, largeur]) => (
            <span key={cle} className={cx("bp-champ-cadre", largeur)}>
              <select
                aria-label={libelle}
                className="bp-fld bp-fld--panel"
                value={filtres[cle]}
                onChange={(e) => filtrer({ [cle]: e.target.value })}
              >
                {options.map((o) => (
                  <option key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </option>
                ))}
              </select>
              <Icon nom="chevronBas" taille={16} className="bp-select-chevron" />
            </span>
          ))}
          <Button type="button" taille="panel" icone="plus" onClick={() => setCreation(true)}>
            Nouveau mouvement
          </Button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mx-3.5 my-0 flex items-center gap-2.5 rounded-controle border border-[var(--bp-trait-10)] bg-[var(--bp-voile-4)] px-4 py-2.5 text-sm"
        >
          <Icon nom="valider" taille={16} className="text-or-icone" />
          {message}
        </p>
      )}

      <div className="overflow-x-auto">
        <DataGrid
          libelle="Historique des mouvements"
          className="min-w-[1030px] text-[14px]"
          hauteurLigne={58}
          vide={
            filtres.q || filtres.categorie
              ? "Aucun mouvement ne correspond."
              : "Aucun mouvement sur cette période."
          }
          colonnes={[
            { cle: "numero", titre: "N° · Date", largeur: "112px" },
            { cle: "sens", titre: "Sens", largeur: "84px" },
            { cle: "categorie", titre: "Catégorie", largeur: "140px" },
            { cle: "motif", titre: "Motif", largeur: "minmax(150px,1fr)" },
            { cle: "contrat", titre: "Contrat lié", largeur: "150px" },
            { cle: "saisi", titre: "Saisi par", largeur: "150px" },
            { cle: "justif", titre: "Justif.", largeur: "52px" },
            { cle: "montant", titre: "Montant", largeur: "100px", alignement: "droite" },
          ]}
          lignes={lignes.map((m) => ({
            cle: m.id,
            cellules: {
              numero: (
                <button
                  type="button"
                  onClick={() => setSelection(m)}
                  className="bp-cible flex cursor-pointer flex-col gap-0.5 border-0 bg-transparent p-0 text-left font-[inherit] text-texte hover:text-or-texte"
                >
                  <span className="text-[13px] font-bold chiffres">
                    <span className="sr-only">Détail de </span>
                    {m.numero}
                  </span>
                  <span className="text-xs chiffres text-texte-attenue">{m.date}</span>
                </button>
              ),
              sens: (
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 text-[13px] font-bold",
                    m.sens === "ENTREE" ? "text-or-texte" : "text-texte",
                  )}
                >
                  <Icon
                    nom={m.sens === "ENTREE" ? "entree" : "sortie"}
                    taille={15}
                    className={m.sens === "ENTREE" ? "text-or-icone" : undefined}
                  />
                  {m.sens === "ENTREE" ? "Entrée" : "Sortie"}
                </span>
              ),
              categorie: <span className="bp-tag">{m.categorie}</span>,
              motif: (
                <span className="flex flex-col gap-0.5">
                  <span className={cx("text-texte-doux", m.barre && "line-through")}>
                    {m.motif}
                  </span>
                  {m.mentions.length > 0 && (
                    <span className="text-xs text-texte-attenue">{m.mentions.join(" · ")}</span>
                  )}
                </span>
              ),
              contrat: m.contrat ? (
                <Link href={m.contrat.href} className="bp-tag bp-cible hover:text-texte">
                  <Icon nom="lien" taille={13} />
                  {m.contrat.numero}
                </Link>
              ) : (
                <span className="text-texte-attenue">—</span>
              ),
              saisi: (
                <span className="inline-flex items-center gap-2 text-[13px]">
                  <Avatar nom={m.saisiPar.nom} url={m.saisiPar.avatarUrl} taille={26} />
                  {m.saisiPar.nom}
                </span>
              ),
              justif: m.justificatif ? (
                <IconButton
                  libelle={`Voir le justificatif ${m.justificatif.numero ?? ""} de ${m.numero}`}
                  icone="trombone"
                  taille="tableau"
                  className="text-or-icone"
                  onClick={() => setSelection(m)}
                />
              ) : m.exigeJustificatif && !m.barre ? (
                <Statut ton="attenue" className="h-6 px-2 text-[11px]">
                  À joindre
                </Statut>
              ) : (
                <span className="text-texte-attenue">—</span>
              ),
              montant: (
                <span
                  className={cx(
                    "font-extrabold chiffres",
                    m.sens === "ENTREE" ? "text-or-texte" : "text-argent-1",
                    m.barre && "line-through",
                  )}
                >
                  {m.montant}
                </span>
              ),
            },
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 pt-1 pb-1.5">
        <span className="text-[13px] text-texte-attenue">
          {pagination.libelle} mouvements
          {libellePeriode ? ` · ${libellePeriode.split(" · ")[0].toLowerCase()}` : ""}
        </span>
        <nav aria-label="Pagination de l’historique" className="flex gap-2">
          {pagination.page > 1 ? (
            <IconButton
              href={url({ page: pagination.page - 1 })}
              scroll={false}
              libelle="Page précédente"
              icone="chevronGauche"
              taille="tableau"
            />
          ) : (
            <IconButton libelle="Page précédente" icone="chevronGauche" taille="tableau" disabled />
          )}
          {pagination.page < pagination.pages ? (
            <IconButton
              href={url({ page: pagination.page + 1 })}
              scroll={false}
              libelle="Page suivante"
              icone="chevronDroite"
              taille="tableau"
            />
          ) : (
            <IconButton libelle="Page suivante" icone="chevronDroite" taille="tableau" disabled />
          )}
        </nav>
      </div>

      <ModaleNouveauMouvement
        ouvert={creation}
        onFermer={() => setCreation(false)}
        onEnregistre={(numero) => {
          setCreation(false);
          setMessage(`${numero.replace(/^\d{4}-/, "")} enregistré au registre.`);
          router.refresh();
        }}
        {...nouveau}
      />
      {selection && (
        <ModaleMouvement
          key={selection.id}
          mouvement={selection}
          onFermer={() => setSelection(null)}
          onFait={(texte) => {
            setSelection(null);
            setMessage(texte);
            router.refresh();
          }}
        />
      )}
    </GlassCard>
  );
}
