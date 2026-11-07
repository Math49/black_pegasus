"use client";

import Image from "next/image";
import { useState } from "react";
import {
  actionEnregistrerCarte,
  actionEnregistrerCategorie,
  actionSupprimerCarte,
  actionSupprimerCategorie,
} from "@/app/admin/(panel)/cards/actions";
import { formaterDollars } from "@/domaine/argent";
import { etatCarte } from "@/domaine/cards";
import { Button, IconButton } from "@/composants/ui/Button";
import { Checkbox, Field, Select } from "@/composants/ui/Field";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Modal } from "@/composants/ui/Modal";
import { Statut } from "@/composants/ui/Statut";
import { Switch } from "@/composants/ui/Switch";
import {
  MessageEtat,
  SectionParametres,
  useEnregistrement,
} from "@/composants/admin/parametres/Section";

type Categorie = { id: string; nom: string; ordre: number; _count: { cartes: number } };
export type CarteAdmin = {
  id: string;
  categorieId: string;
  nom: string;
  prix: number;
  stock: number;
  ordre: number;
  visible: boolean;
  photoUrl: string | null;
  categorie: { nom: string };
};

function FormulaireCategorie({ categorie }: { categorie?: Categorie }) {
  const [nom, setNom] = useState(categorie?.nom ?? "");
  const [ordre, setOrdre] = useState(String(categorie?.ordre ?? 0));
  const { enregistrer, enCours, etat } = useEnregistrement((d: { nom: string; ordre: number }) =>
    actionEnregistrerCategorie(categorie?.id ?? null, d),
  );
  const suppression = useEnregistrement(actionSupprimerCategorie);
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-controle border border-[var(--bp-trait-8)] p-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          enregistrer({ nom, ordre: Number(ordre) });
        }}
      >
        <Field
          label={categorie ? `Nom de la catégorie ${categorie.nom}` : "Nouvelle catégorie"}
          required
          minLength={2}
          maxLength={100}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Field
          label={categorie ? `Ordre de la catégorie ${categorie.nom}` : "Ordre de la catégorie"}
          type="number"
          required
          min={0}
          max={1000}
          value={ordre}
          onChange={(e) => setOrdre(e.target.value)}
          className="w-44"
        />
        <Button
          type="submit"
          taille="panel"
          variante="verre"
          disabled={enCours || suppression.enCours}
        >
          {categorie ? "Enregistrer la catégorie" : "Ajouter la catégorie"}
        </Button>
        {categorie && (
          <IconButton
            icone="corbeille"
            variante="danger"
            libelle={`Supprimer la catégorie ${categorie.nom}`}
            disabled={categorie._count.cartes > 0 || suppression.enCours || enCours}
            onClick={() => suppression.enregistrer(categorie.id)}
          />
        )}
      </form>
      {categorie && (
        <p className="m-0 text-xs text-texte-doux">
          {categorie._count.cartes > 0
            ? "Catégorie utilisée : suppression impossible, y compris si une carte a été retirée."
            : "Aucune carte dans cette catégorie."}
        </p>
      )}
      <MessageEtat etat={etat ?? suppression.etat} />
    </div>
  );
}

function FormulaireCarte({
  carte,
  categories,
  fermer,
}: {
  carte: CarteAdmin | null;
  categories: Categorie[];
  fermer: () => void;
}) {
  const [visible, setVisible] = useState(carte?.visible ?? true);
  const { enregistrer, enCours, etat } = useEnregistrement(async (donnees: FormData) => {
    const r = await actionEnregistrerCarte(donnees);
    if (r.ok) fermer();
    return r;
  });
  return (
    <form
      aria-label={carte ? `Modifier ${carte.nom}` : "Ajouter une carte"}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        d.set("id", carte?.id ?? "");
        d.set("visible", visible ? "1" : "0");
        enregistrer(d);
      }}
    >
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field
          label="Nom de la carte"
          name="nom"
          required
          minLength={2}
          maxLength={100}
          defaultValue={carte?.nom}
        />
        <Select
          label="Catégorie"
          name="categorieId"
          required
          defaultValue={carte?.categorieId ?? categories[0]?.id}
          options={categories.map((c) => ({ valeur: c.id, libelle: c.nom }))}
        />
        <Field
          label="Prix ($)"
          name="prix"
          type="number"
          required
          min={0}
          max={10_000_000}
          step={1}
          defaultValue={carte?.prix}
        />
        <Field
          label="Exemplaires en stock"
          name="stock"
          type="number"
          required
          min={0}
          max={100_000}
          step={1}
          defaultValue={carte?.stock ?? 0}
          aide={carte ? "Une correction du stock est inscrite au journal." : undefined}
        />
        <Field
          label="Ordre de la carte"
          name="ordre"
          type="number"
          required
          min={0}
          max={1000}
          step={1}
          defaultValue={carte?.ordre ?? 0}
        />
        <Field
          label="Photo (facultative)"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aide="PNG, JPG ou WEBP, 10 Mo maximum. Sans photo, le visuel par défaut s’affiche."
        />
      </div>
      {carte?.photoUrl && (
        <div className="flex flex-wrap items-center gap-4">
          <Image
            src={carte.photoUrl}
            alt={`Photo actuelle de ${carte.nom}`}
            width={72}
            height={100}
            className="h-[100px] w-[72px] rounded-[8px] object-cover"
          />
          <Checkbox name="retirerPhoto" value="1" label="Retirer la photo" />
        </div>
      )}
      <Switch label="Visible sur le site" coche={visible} onChange={setVisible} />
      <MessageEtat etat={etat} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variante="verre" taille="panel" onClick={fermer} disabled={enCours}>
          Annuler
        </Button>
        <Button type="submit" taille="panel" disabled={enCours}>
          Enregistrer la carte
        </Button>
      </div>
    </form>
  );
}

export function GestionCards({
  categories,
  cartes,
}: {
  categories: Categorie[];
  cartes: CarteAdmin[];
}) {
  const [edition, setEdition] = useState<CarteAdmin | null | undefined>(undefined);
  const [suppression, setSuppression] = useState<CarteAdmin | null>(null);
  const retirer = useEnregistrement(async (id: string) => {
    const r = await actionSupprimerCarte(id);
    if (r.ok) setSuppression(null);
    return r;
  });
  return (
    <>
      <SectionParametres
        id="categories-cartes"
        titre="Catégories"
        description="Un seul niveau de catégories, affichées dans cet ordre sur le site. Une catégorie qui contient des cartes reste protégée."
      >
        {categories.map((c) => (
          <FormulaireCategorie key={`${c.id}-${c.nom}-${c.ordre}`} categorie={c} />
        ))}
        <FormulaireCategorie key={`nouvelle-${categories.length}`} />
      </SectionParametres>
      <GlassCard
        as="section"
        variante="admin"
        aria-labelledby="cartes-titre"
        className="flex flex-col gap-5 p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="cartes-titre" className="m-0 titre text-xl font-semibold">
            Catalogue des cartes
          </h2>
          <Button
            taille="panel"
            icone="plus"
            disabled={categories.length === 0}
            onClick={() => setEdition(null)}
          >
            Ajouter une carte
          </Button>
        </div>
        {categories.length === 0 && (
          <p className="m-0 text-texte-doux">Créez une catégorie avant d’ajouter une carte.</p>
        )}
        {cartes.length === 0 && (
          <p className="m-0 text-texte-doux">Aucune carte dans le catalogue.</p>
        )}
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {cartes.map((c) => {
            const etat = etatCarte(c.stock);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-4 rounded-controle border border-[var(--bp-trait-8)] p-4"
              >
                <Image
                  src={c.photoUrl ?? "/images/logos/bp-cards.webp"}
                  alt=""
                  width={48}
                  height={66}
                  className="h-[66px] w-12 flex-none rounded-[6px] bg-noir object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h3 className="m-0 titre text-lg font-semibold">{c.nom}</h3>
                  <span className="text-sm text-texte-doux">
                    {c.categorie.nom} · {formaterDollars(c.prix)} ·{" "}
                    {c.visible ? "Visible sur le site" : "Masquée sur le site"}
                  </span>
                </div>
                <Statut ton={etat.epuisee ? "attenue" : "ok"} point>
                  {etat.libelle}
                </Statut>
                <div className="flex flex-wrap gap-2">
                  <Button
                    taille="panel"
                    variante="verre"
                    onClick={() => setEdition(c)}
                    aria-label={`Modifier ${c.nom}`}
                  >
                    Modifier
                  </Button>
                  <IconButton
                    icone="corbeille"
                    variante="danger"
                    libelle={`Retirer ${c.nom}`}
                    onClick={() => {
                      retirer.effacer();
                      setSuppression(c);
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </GlassCard>
      <Modal
        ouvert={edition !== undefined}
        onFermer={() => setEdition(undefined)}
        titre={edition ? `Modifier ${edition.nom}` : "Ajouter une carte"}
        largeur={720}
      >
        {edition !== undefined && (
          <FormulaireCarte
            key={edition?.id ?? "nouvelle"}
            carte={edition}
            categories={categories}
            fermer={() => setEdition(undefined)}
          />
        )}
      </Modal>
      <Modal
        ouvert={suppression !== null}
        onFermer={() => {
          if (!retirer.enCours) setSuppression(null);
        }}
        titre="Retirer la carte"
        icone="alerte"
        actions={
          <>
            <Button
              variante="verre"
              taille="panel"
              disabled={retirer.enCours}
              onClick={() => setSuppression(null)}
            >
              Conserver la carte
            </Button>
            <Button
              variante="danger"
              taille="panel"
              icone="corbeille"
              disabled={retirer.enCours}
              onClick={() => suppression && retirer.enregistrer(suppression.id)}
            >
              Retirer la carte
            </Button>
          </>
        }
      >
        <p className="m-0 leading-relaxed">
          « {suppression?.nom} » sera retirée du catalogue et du site. Ses ventes restent lisibles.
        </p>
        <MessageEtat etat={retirer.etat} />
      </Modal>
    </>
  );
}
