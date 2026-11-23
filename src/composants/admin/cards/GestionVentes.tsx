"use client";

import { useState } from "react";
import { actionAnnulerVente, actionCreerVente } from "@/app/admin/(panel)/cards/actions";
import { formaterDollars, SEPARATEUR_MILLIERS } from "@/domaine/argent";
import { correspondRecherche, remisePourcent, resumeLignes } from "@/domaine/cards";
import { Button, IconButton } from "@/composants/ui/Button";
import { Field, Select } from "@/composants/ui/Field";
import { Icon } from "@/composants/ui/Icon";
import { Modal } from "@/composants/ui/Modal";
import { MessageEtat, useEnregistrement } from "@/composants/admin/parametres/Section";
import { cx } from "@/lib/classes";

/** Carte proposée à la vente : en stock, hors enchère (filtré par le serveur). */
export type CarteVendable = {
  id: string;
  nom: string;
  prix: number;
  stock: number;
  categorie: { nom: string };
};

type Ligne = { carteId: string; quantite: number };

/** « 2400 » → « 2 400 » pendant la saisie (chiffres seulement). */
const grouper = (t: string) =>
  t
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9)
    .replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);
const lireMontant = (t: string) =>
  t.replace(/\D/g, "") === "" ? NaN : Number(t.replace(/\D/g, ""));

/**
 * Nouvelle vente (REFONTE-ADMIN § 4) : sélection de plusieurs cartes dans un catalogue
 * filtrable, panier, montant encaissé modifiable (remise). Les montants sont indicatifs :
 * le serveur les recalcule et borne l'encaissé au prix du catalogue.
 */
function FormulaireVente({ cartes, fermer }: { cartes: CarteVendable[]; fermer: () => void }) {
  const [q, setQ] = useState("");
  const [categorie, setCategorie] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  // Vide : le montant encaissé suit le total du catalogue.
  const [encaisse, setEncaisse] = useState("");
  const [client, setClient] = useState({ nom: "", telephone: "" });
  const { enregistrer, enCours, etat } = useEnregistrement(
    async (d: Parameters<typeof actionCreerVente>[0]) => {
      const r = await actionCreerVente(d);
      if (r.ok) fermer();
      return r;
    },
  );

  const categories = [...new Set(cartes.map((c) => c.categorie.nom))];
  const proposees = cartes.filter(
    (c) => correspondRecherche(c.nom, q) && (!categorie || c.categorie.nom === categorie),
  );
  const carte = (id: string) => cartes.find((c) => c.id === id)!;
  const total = lignes.reduce((t, l) => t + carte(l.carteId).prix * l.quantite, 0);
  const montant = encaisse === "" ? total : lireMontant(encaisse);
  const remise = Number.isFinite(montant) ? total - montant : 0;
  const tropEleve = Number.isFinite(montant) && montant > total;

  const ajouter = (id: string) => {
    const l = lignes.find((x) => x.carteId === id);
    if (!l) setLignes([...lignes, { carteId: id, quantite: 1 }]);
    else if (l.quantite < carte(id).stock)
      setLignes(lignes.map((x) => (x.carteId === id ? { ...x, quantite: x.quantite + 1 } : x)));
  };
  const changer = (id: string, quantite: number) =>
    setLignes(
      quantite <= 0
        ? lignes.filter((x) => x.carteId !== id)
        : lignes.map((x) =>
            x.carteId === id ? { ...x, quantite: Math.min(quantite, carte(id).stock) } : x,
          ),
    );

  return (
    <form
      aria-label="Nouvelle vente"
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer(
          {
            lignes,
            montantEncaisse: encaisse === "" ? null : lireMontant(encaisse),
            clientNom: client.nom,
            clientTelephone: client.telephone,
          },
          "Vente enregistrée : stock et registre mis à jour.",
        );
      }}
    >
      <section aria-labelledby="titre-catalogue-vente" className="flex min-w-0 flex-col gap-3">
        <h3 id="titre-catalogue-vente" className="m-0 titre text-base font-semibold">
          Cartes en stock
        </h3>
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3">
          <Field
            label="Rechercher une carte"
            type="search"
            maxLength={80}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            label="Catégorie"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            options={[
              { valeur: "", libelle: "Toutes" },
              ...categories.map((c) => ({ valeur: c, libelle: c })),
            ]}
          />
        </div>
        {cartes.length === 0 ? (
          <p className="m-0 text-texte-doux">Aucune carte en stock : ajoutez des exemplaires.</p>
        ) : (
          <ul
            aria-label="Cartes proposées"
            className="m-0 flex h-[380px] list-none flex-col gap-1 overflow-y-auto rounded-[14px] border border-[var(--bp-trait-8)] p-1.5"
          >
            {proposees.length === 0 && (
              <li className="p-3 text-sm text-texte-doux">Aucune carte ne correspond.</li>
            )}
            {proposees.map((c) => {
              const dansPanier = lignes.find((l) => l.carteId === c.id)?.quantite ?? 0;
              const complet = dansPanier >= c.stock;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={complet}
                    onClick={() => ajouter(c.id)}
                    className={cx(
                      "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] border-0 bg-transparent px-3 py-2 text-left font-[inherit] text-texte hover:bg-[var(--bp-voile-6)]",
                      complet && "cursor-default opacity-50",
                    )}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-bold">
                        <span className="sr-only">Ajouter </span>
                        {c.nom}
                      </span>
                      <span className="text-xs text-texte-attenue">
                        {c.categorie.nom} · {c.stock} en stock
                        {dansPanier > 0 && ` · ${dansPanier} dans la vente`}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      <span className="text-sm font-extrabold chiffres text-or-texte">
                        {formaterDollars(c.prix)}
                      </span>
                      <Icon nom="plus" taille={16} className="text-argent-1" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-panier" className="flex min-w-0 flex-col gap-3">
        <h3 id="titre-panier" className="m-0 titre text-base font-semibold">
          Vente · {lignes.length} carte{lignes.length > 1 ? "s" : ""}
        </h3>
        <ul
          aria-label="Cartes de la vente"
          className="m-0 flex max-h-[210px] min-h-[64px] list-none flex-col gap-1 overflow-y-auto rounded-[14px] border border-[var(--bp-trait-8)] p-1.5"
        >
          {lignes.length === 0 && (
            <li className="p-3 text-sm text-texte-doux">Choisissez des cartes dans la liste.</li>
          )}
          {lignes.map((l) => {
            const c = carte(l.carteId);
            return (
              <li key={l.carteId} className="flex items-center justify-between gap-2 px-2 py-1">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold">{c.nom}</span>
                  <span className="text-xs chiffres text-texte-attenue">
                    {formaterDollars(c.prix)} × {l.quantite} ={" "}
                    {formaterDollars(c.prix * l.quantite)}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-1">
                  <IconButton
                    icone="moins"
                    taille="tableau"
                    libelle={`Un exemplaire de moins de ${c.nom}`}
                    onClick={() => changer(l.carteId, l.quantite - 1)}
                  />
                  <span className="w-7 text-center text-sm font-bold chiffres">{l.quantite}</span>
                  <IconButton
                    icone="plus"
                    taille="tableau"
                    libelle={`Un exemplaire de plus de ${c.nom}`}
                    disabled={l.quantite >= c.stock}
                    onClick={() => changer(l.carteId, l.quantite + 1)}
                  />
                  <IconButton
                    icone="fermer"
                    taille="tableau"
                    libelle={`Retirer ${c.nom} de la vente`}
                    onClick={() => changer(l.carteId, 0)}
                  />
                </span>
              </li>
            );
          })}
        </ul>

        <dl className="m-0 flex flex-col gap-1.5 rounded-[14px] border border-[var(--bp-trait-8)] px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-texte-doux">Prix du catalogue</dt>
            <dd className="m-0 font-bold chiffres">{formaterDollars(total)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-texte-doux">Remise</dt>
            <dd className="m-0 font-bold chiffres">
              {remise > 0
                ? `${formaterDollars(remise)} (${remisePourcent(remise, total)} %)`
                : "Aucune"}
            </dd>
          </div>
        </dl>
        <Field
          label="Montant encaissé ($)"
          inputMode="numeric"
          autoComplete="off"
          placeholder={grouper(String(total))}
          aide="Laissez vide pour encaisser le prix du catalogue ; jamais au-dessus."
          erreur={tropEleve ? `Au plus ${formaterDollars(total)} (prix du catalogue).` : undefined}
          value={encaisse}
          onChange={(e) => setEncaisse(grouper(e.target.value))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Nom du client (RP)"
            required
            minLength={2}
            maxLength={80}
            value={client.nom}
            onChange={(e) => setClient({ ...client, nom: e.target.value })}
          />
          <Field
            label="Téléphone (facultatif)"
            maxLength={20}
            value={client.telephone}
            onChange={(e) => setClient({ ...client, telephone: e.target.value })}
          />
        </div>
        <p className="m-0 flex items-baseline justify-between gap-4 rounded-controle border border-[var(--bp-or-30)] px-4 py-3">
          <span className="text-sm text-texte-doux">À encaisser</span>
          <span className="texte-or titre text-2xl font-bold chiffres">
            {Number.isFinite(montant) ? formaterDollars(montant) : "—"}
          </span>
        </p>
        <MessageEtat etat={etat} />
        <div className="flex flex-wrap justify-end gap-3">
          <Button variante="verre" taille="panel" onClick={fermer} disabled={enCours}>
            Annuler
          </Button>
          <Button
            type="submit"
            taille="panel"
            disabled={enCours || lignes.length === 0 || tropEleve}
          >
            Enregistrer la vente
          </Button>
        </div>
      </section>
    </form>
  );
}

/** Bouton « Nouvelle vente » et sa modale. */
export function NouvelleVente({
  cartes,
  ouvertInitial = false,
}: {
  cartes: CarteVendable[];
  /** Modale ouverte d'emblée (raccourci « Nouvelle vente » du tableau de bord). */
  ouvertInitial?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertInitial);
  return (
    <>
      <Button taille="panel" icone="plus" onClick={() => setOuvert(true)}>
        Nouvelle vente
      </Button>
      <Modal ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Nouvelle vente" largeur={980}>
        {ouvert && <FormulaireVente cartes={cartes} fermer={() => setOuvert(false)} />}
      </Modal>
    </>
  );
}

/** Annulation d'une vente (administrateur), avec confirmation. */
export function AnnulerVente({
  vente,
}: {
  vente: {
    id: string;
    numero: string;
    montant: number;
    lignes: { carteNom: string; quantite: number }[];
  };
}) {
  const [ouvert, setOuvert] = useState(false);
  const annulation = useEnregistrement(async (id: string) => {
    const r = await actionAnnulerVente(id);
    if (r.ok) setOuvert(false);
    return r;
  });
  return (
    <>
      <Button
        taille="panel-petit"
        variante="danger"
        icone="fermer"
        onClick={() => {
          annulation.effacer();
          setOuvert(true);
        }}
        aria-label={`Annuler la vente ${vente.numero}`}
      >
        Annuler
      </Button>
      <Modal
        ouvert={ouvert}
        onFermer={() => {
          if (!annulation.enCours) setOuvert(false);
        }}
        titre={`Annuler la vente ${vente.numero}`}
        icone="alerte"
        actions={
          <>
            <Button
              variante="verre"
              taille="panel"
              disabled={annulation.enCours}
              onClick={() => setOuvert(false)}
            >
              Conserver la vente
            </Button>
            <Button
              variante="danger"
              taille="panel"
              icone="fermer"
              disabled={annulation.enCours}
              onClick={() => annulation.enregistrer(vente.id)}
            >
              Annuler la vente
            </Button>
          </>
        }
      >
        <p className="m-0 leading-relaxed">
          La recette de {formaterDollars(vente.montant)} sera contre-passée au registre et les
          cartes reviendront en stock : {resumeLignes(vente.lignes)}.
        </p>
        <MessageEtat etat={annulation.etat} />
      </Modal>
    </>
  );
}
