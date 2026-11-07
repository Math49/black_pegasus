"use client";

import { useState } from "react";
import { actionAnnulerVente, actionCreerVente } from "@/app/admin/(panel)/cards/actions";
import { formaterDollars } from "@/domaine/argent";
import { montantVente } from "@/domaine/cards";
import { Button } from "@/composants/ui/Button";
import { Field, Select } from "@/composants/ui/Field";
import { Modal } from "@/composants/ui/Modal";
import { MessageEtat, useEnregistrement } from "@/composants/admin/parametres/Section";

export type CarteVendable = {
  id: string;
  nom: string;
  prix: number;
  stock: number;
  categorie: { nom: string };
};

type SaisieVente = {
  carteId: string;
  quantite: number;
  clientNom: string;
  clientTelephone: string;
};

function FormulaireVente({ cartes, fermer }: { cartes: CarteVendable[]; fermer: () => void }) {
  const enStock = cartes.filter((c) => c.stock > 0);
  const [d, setD] = useState<SaisieVente>({
    carteId: enStock[0]?.id ?? "",
    quantite: 1,
    clientNom: "",
    clientTelephone: "",
  });
  const { enregistrer, enCours, etat } = useEnregistrement(async (saisie: SaisieVente) => {
    const r = await actionCreerVente(saisie);
    if (r.ok) fermer();
    return r;
  });
  const carte = cartes.find((c) => c.id === d.carteId);
  // Indicatif : le montant enregistré est recalculé par le serveur.
  let apercu: number | null = null;
  try {
    if (carte) apercu = montantVente(carte.prix, d.quantite);
  } catch {
    // Saisie incomplète ou invalide : pas d'aperçu, le serveur répondra à l'envoi.
  }
  return (
    <form
      aria-label="Nouvelle vente"
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer(d, "Vente enregistrée : stock et registre mis à jour.");
      }}
    >
      {enStock.length === 0 && (
        <p className="m-0 text-texte-doux">Aucune carte en stock : ajoutez des exemplaires.</p>
      )}
      <Select
        label="Carte"
        required
        value={d.carteId}
        onChange={(e) => setD({ ...d, carteId: e.target.value })}
        options={cartes.map((c) => ({
          valeur: c.id,
          libelle: `${c.nom} · ${c.categorie.nom} · ${formaterDollars(c.prix)} · ${
            c.stock > 0 ? `${c.stock} en stock` : "épuisée"
          }`,
          desactivee: c.stock === 0,
        }))}
      />
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field
          label="Quantité"
          type="number"
          required
          min={1}
          max={Math.max(1, carte?.stock ?? 1)}
          step={1}
          value={Number.isNaN(d.quantite) ? "" : d.quantite}
          onChange={(e) => setD({ ...d, quantite: e.target.valueAsNumber })}
        />
        <Field
          label="Nom du client (RP)"
          required
          minLength={2}
          maxLength={80}
          value={d.clientNom}
          onChange={(e) => setD({ ...d, clientNom: e.target.value })}
        />
        <Field
          label="Téléphone du client (facultatif)"
          maxLength={20}
          value={d.clientTelephone}
          onChange={(e) => setD({ ...d, clientTelephone: e.target.value })}
        />
      </div>
      <p className="m-0 flex items-baseline justify-between gap-4 rounded-controle border border-[var(--bp-trait-8)] px-4 py-3">
        <span className="text-sm text-texte-doux">Montant encaissé</span>
        <span className="texte-or titre text-2xl font-bold chiffres">
          {apercu === null ? "—" : formaterDollars(apercu)}
        </span>
      </p>
      <MessageEtat etat={etat} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variante="verre" taille="panel" onClick={fermer} disabled={enCours}>
          Annuler
        </Button>
        <Button type="submit" taille="panel" disabled={enCours || enStock.length === 0}>
          Enregistrer la vente
        </Button>
      </div>
    </form>
  );
}

/** Bouton « Nouvelle vente » et sa modale. */
export function NouvelleVente({ cartes }: { cartes: CarteVendable[] }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Button taille="panel" icone="plus" onClick={() => setOuvert(true)}>
        Nouvelle vente
      </Button>
      <Modal ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Nouvelle vente" largeur={640}>
        {ouvert && <FormulaireVente cartes={cartes} fermer={() => setOuvert(false)} />}
      </Modal>
    </>
  );
}

/** Annulation d'une vente (administrateur), avec confirmation. */
export function AnnulerVente({
  vente,
}: {
  vente: { id: string; numero: string; carteNom: string; quantite: number; montant: number };
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
          La recette de {formaterDollars(vente.montant)} sera contre-passée au registre et{" "}
          {vente.quantite} exemplaire{vente.quantite > 1 ? "s" : ""} de « {vente.carteNom} »{" "}
          {vente.quantite > 1 ? "reviendront" : "reviendra"} en stock.
        </p>
        <MessageEtat etat={annulation.etat} />
      </Modal>
    </>
  );
}
