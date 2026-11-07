"use client";

import { useState } from "react";
import {
  actionEnregistrerDomaine,
  actionSupprimerDomaine,
  actionEnregistrerPermis,
  actionSupprimerPermis,
} from "@/app/admin/(panel)/formation/actions";
import { formaterDollars } from "@/domaine/argent";
import type { DonneesPermis } from "@/services/formation";
import { Button, IconButton } from "@/composants/ui/Button";
import { Field, Select, TextArea } from "@/composants/ui/Field";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Modal } from "@/composants/ui/Modal";
import { Switch } from "@/composants/ui/Switch";
import {
  MessageEtat,
  SectionParametres,
  useEnregistrement,
} from "@/composants/admin/parametres/Section";

type Domaine = { id: string; nom: string; ordre: number; _count: { permis: number } };
type Permis = DonneesPermis & { id: string; domaine: { nom: string } };

function FormulaireDomaine({ domaine }: { domaine?: Domaine }) {
  const [nom, setNom] = useState(domaine?.nom ?? "");
  const [ordre, setOrdre] = useState(String(domaine?.ordre ?? 0));
  const { enregistrer, enCours, etat } = useEnregistrement((d: { nom: string; ordre: number }) =>
    actionEnregistrerDomaine(domaine?.id ?? null, d),
  );
  const suppression = useEnregistrement(actionSupprimerDomaine);
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
          label={domaine ? `Nom du domaine ${domaine.nom}` : "Nouveau domaine"}
          required
          minLength={2}
          maxLength={100}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Field
          label={domaine ? `Ordre du domaine ${domaine.nom}` : "Ordre du nouveau domaine"}
          type="number"
          required
          min={0}
          max={1000}
          value={ordre}
          onChange={(e) => setOrdre(e.target.value)}
          className="w-24"
        />
        <Button
          type="submit"
          taille="panel"
          variante="verre"
          disabled={enCours || suppression.enCours}
        >
          {domaine ? "Enregistrer le domaine" : "Ajouter le domaine"}
        </Button>
        {domaine && (
          <IconButton
            icone="corbeille"
            variante="danger"
            libelle={`Supprimer le domaine ${domaine.nom}`}
            disabled={domaine._count.permis > 0 || suppression.enCours || enCours}
            onClick={() => suppression.enregistrer(domaine.id)}
          />
        )}
      </form>
      {domaine && (
        <p className="m-0 text-xs text-texte-doux">
          {domaine._count.permis > 0
            ? "Domaine utilisé : suppression impossible, y compris si un permis a été archivé."
            : "Aucun permis dans ce domaine."}
        </p>
      )}
      <MessageEtat etat={etat ?? suppression.etat} />
    </div>
  );
}

function FormulairePermis({
  permis,
  domaines,
  fermer,
}: {
  permis: Permis | null;
  domaines: Domaine[];
  fermer: () => void;
}) {
  const [d, setD] = useState<DonneesPermis>(
    permis ?? {
      domaineId: domaines[0]?.id ?? "",
      nom: "",
      description: "",
      prerequis: "",
      duree: "",
      epreuves: "",
      prix: 0,
      ordre: 0,
      visible: true,
    },
  );
  const [prix, setPrix] = useState(permis ? String(permis.prix) : "");
  const [ordre, setOrdre] = useState(String(permis?.ordre ?? 0));
  const { enregistrer, enCours, etat } = useEnregistrement(async (donnees: DonneesPermis) => {
    const r = await actionEnregistrerPermis(permis?.id ?? null, donnees);
    if (r.ok) fermer();
    return r;
  });
  const champ = (cle: "nom" | "description" | "prerequis" | "duree" | "epreuves") => ({
    value: d[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setD({ ...d, [cle]: e.target.value }),
  });
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer({
          ...d,
          prix: prix.trim() === "" ? Number.NaN : Number(prix),
          ordre: Number(ordre),
        });
      }}
    >
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label="Nom du permis" required minLength={2} maxLength={100} {...champ("nom")} />
        <Select
          label="Domaine"
          required
          value={d.domaineId}
          onChange={(e) => setD({ ...d, domaineId: e.target.value })}
          options={domaines.map((x) => ({ valeur: x.id, libelle: x.nom }))}
        />
        <Field
          label="Tarif ($)"
          type="number"
          required
          min={0}
          max={10_000_000}
          step={1}
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
        />
        <Field
          label="Ordre du permis"
          type="number"
          required
          min={0}
          max={1000}
          step={1}
          value={ordre}
          onChange={(e) => setOrdre(e.target.value)}
        />
      </div>
      <TextArea
        label="Description"
        required
        minLength={2}
        maxLength={6000}
        rows={3}
        aide="Mise en forme : **gras**, paragraphes, listes de clauses et liens internes."
        {...champ("description")}
      />
      <TextArea label="Prérequis" maxLength={1500} rows={2} {...champ("prerequis")} />
      <Field label="Durée" maxLength={200} {...champ("duree")} />
      <TextArea label="Épreuves" maxLength={2000} rows={2} {...champ("epreuves")} />
      <Switch
        label="Visible sur le site"
        coche={d.visible}
        onChange={(visible) => setD({ ...d, visible })}
      />
      <MessageEtat etat={etat} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variante="verre" taille="panel" onClick={fermer} disabled={enCours}>
          Annuler
        </Button>
        <Button type="submit" taille="panel" disabled={enCours}>
          Enregistrer le permis
        </Button>
      </div>
    </form>
  );
}

export function GestionFormation({ domaines, permis }: { domaines: Domaine[]; permis: Permis[] }) {
  const [edition, setEdition] = useState<Permis | null | undefined>(undefined);
  const [suppression, setSuppression] = useState<Permis | null>(null);
  const retirer = useEnregistrement(async (id: string) => {
    const r = await actionSupprimerPermis(id);
    if (r.ok) setSuppression(null);
    return r;
  });
  return (
    <>
      <SectionParametres
        id="domaines"
        titre="Domaines de formation"
        description="Ajoutez et ordonnez les domaines du catalogue. Un domaine utilisé par un permis reste protégé."
      >
        {domaines.map((d) => (
          <FormulaireDomaine key={`${d.id}-${d.nom}-${d.ordre}`} domaine={d} />
        ))}
        <FormulaireDomaine key={`nouveau-${domaines.length}`} />
      </SectionParametres>
      <GlassCard
        as="section"
        variante="admin"
        aria-labelledby="catalogue-titre"
        className="flex flex-col gap-5 p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="catalogue-titre" className="m-0 titre text-xl font-semibold">
            Catalogue des permis
          </h2>
          <Button
            taille="panel"
            icone="plus"
            disabled={domaines.length === 0}
            onClick={() => setEdition(null)}
          >
            Ajouter un permis
          </Button>
        </div>
        {domaines.length === 0 && (
          <p className="m-0 text-texte-doux">Créez un domaine avant d’ajouter un permis.</p>
        )}
        {permis.length === 0 && (
          <p className="m-0 text-texte-doux">Aucun permis dans le catalogue.</p>
        )}
        {permis.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-controle border border-[var(--bp-trait-8)] p-4"
          >
            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="m-0 titre text-lg font-semibold">{p.nom}</h3>
              <span className="text-sm text-texte-doux">
                {p.domaine.nom} · {formaterDollars(p.prix)} ·{" "}
                {p.visible ? "Visible sur le site" : "Masqué sur le site"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                taille="panel"
                variante="verre"
                onClick={() => setEdition(p)}
                aria-label={`Modifier ${p.nom}`}
              >
                Modifier
              </Button>
              <IconButton
                icone="corbeille"
                variante="danger"
                libelle={`Supprimer ${p.nom}`}
                onClick={() => {
                  retirer.effacer();
                  setSuppression(p);
                }}
              />
            </div>
          </div>
        ))}
      </GlassCard>
      <Modal
        ouvert={edition !== undefined}
        onFermer={() => setEdition(undefined)}
        titre={edition ? `Modifier ${edition.nom}` : "Ajouter un permis"}
        largeur={720}
      >
        {edition !== undefined && (
          <FormulairePermis
            key={edition?.id ?? "nouveau"}
            permis={edition}
            domaines={domaines}
            fermer={() => setEdition(undefined)}
          />
        )}
      </Modal>
      <Modal
        ouvert={suppression !== null}
        onFermer={() => {
          if (!retirer.enCours) setSuppression(null);
        }}
        titre="Supprimer le permis"
        icone="alerte"
        actions={
          <>
            <Button
              variante="verre"
              taille="panel"
              disabled={retirer.enCours}
              onClick={() => setSuppression(null)}
            >
              Conserver le permis
            </Button>
            <Button
              variante="danger"
              taille="panel"
              icone="corbeille"
              disabled={retirer.enCours}
              onClick={() => suppression && retirer.enregistrer(suppression.id)}
            >
              Supprimer le permis
            </Button>
          </>
        }
      >
        <p className="m-0 leading-relaxed">
          « {suppression?.nom} » sera retiré du catalogue. Les demandes reçues seront conservées.
        </p>
        <MessageEtat etat={retirer.etat} />
      </Modal>
    </>
  );
}
