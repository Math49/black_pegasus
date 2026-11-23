"use client";

import { useState } from "react";
import {
  actionAnnulerEnchere,
  actionConclureEnchere,
  actionEcarterOffre,
  actionEncherisseurSuivant,
  actionRelancerEnchere,
} from "@/app/admin/(panel)/cards/encheres/actions";
import { Button } from "@/composants/ui/Button";
import { Modal } from "@/composants/ui/Modal";
import { MessageEtat, useEnregistrement } from "@/composants/admin/parametres/Section";
import type { Resultat } from "@/lib/resultat";

type Confirmation = {
  titre: string;
  texte: string;
  libelle: string;
  danger?: boolean;
  action: () => Promise<Resultat<unknown>>;
  succes: string;
};

/** Bouton d'action avec confirmation (les décisions d'enchère sont irréversibles). */
function Decision({
  bouton,
  variante = "verre",
  confirmation,
}: {
  bouton: string;
  variante?: "or" | "verre" | "danger";
  confirmation: Confirmation;
}) {
  const [ouvert, setOuvert] = useState(false);
  const { enregistrer, enCours, etat, effacer } = useEnregistrement(async () => {
    const r = await confirmation.action();
    if (r.ok) setOuvert(false);
    return r;
  });
  return (
    <>
      <Button
        taille="panel"
        variante={variante}
        onClick={() => {
          effacer();
          setOuvert(true);
        }}
      >
        {bouton}
      </Button>
      <Modal
        ouvert={ouvert}
        onFermer={() => !enCours && setOuvert(false)}
        titre={confirmation.titre}
        icone={confirmation.danger ? "alerte" : undefined}
        actions={
          <>
            <Button
              variante="verre"
              taille="panel"
              disabled={enCours}
              onClick={() => setOuvert(false)}
            >
              Retour
            </Button>
            <Button
              taille="panel"
              variante={confirmation.danger ? "danger" : "or"}
              disabled={enCours}
              onClick={() => enregistrer(undefined, confirmation.succes)}
            >
              {confirmation.libelle}
            </Button>
          </>
        }
      >
        <p className="m-0 leading-relaxed">{confirmation.texte}</p>
        <MessageEtat etat={etat} />
      </Modal>
    </>
  );
}

/** Décisions possibles selon l'état de l'enchère. */
export function ActionsEnchere({
  enchere,
}: {
  enchere: {
    id: string;
    carteNom: string;
    etat: "en_cours" | "a_conclure" | "sans_offre";
    gagnante: { id: string; nom: string; montant: string } | null;
  };
}) {
  const { id, carteNom, etat, gagnante } = enchere;
  return (
    <div className="flex flex-wrap gap-3">
      {etat === "a_conclure" && gagnante && (
        <>
          <Decision
            bouton="Conclure la vente"
            variante="or"
            confirmation={{
              titre: "Conclure la vente",
              texte: `${carteNom} sera vendue ${gagnante.montant} à ${gagnante.nom} : vente enregistrée, recette inscrite au registre et un exemplaire retiré du stock. Confirmez après le paiement en jeu.`,
              libelle: "Conclure",
              action: () => actionConclureEnchere(id),
              succes: "Enchère conclue : vente enregistrée.",
            }}
          />
          <Decision
            bouton="Passer à l’enchérisseur suivant"
            confirmation={{
              titre: "Enchérisseur suivant",
              texte: `L’offre de ${gagnante.nom} (${gagnante.montant}) sera écartée comme défaillante ; la meilleure offre suivante deviendra gagnante.`,
              libelle: "Écarter et passer au suivant",
              danger: true,
              action: () => actionEncherisseurSuivant(gagnante.id),
              succes: "Offre écartée : l’enchérisseur suivant est gagnant.",
            }}
          />
        </>
      )}
      {etat === "sans_offre" && (
        <Decision
          bouton="Relancer l’enchère"
          variante="or"
          confirmation={{
            titre: "Relancer l’enchère",
            texte: `L’enchère sur ${carteNom} repart pour sa durée initiale, à partir de maintenant.`,
            libelle: "Relancer",
            action: () => actionRelancerEnchere(id),
            succes: "Enchère relancée.",
          }}
        />
      )}
      <Decision
        bouton={etat === "sans_offre" ? "Repasser en vente classique" : "Annuler l’enchère"}
        variante="danger"
        confirmation={{
          titre: "Annuler l’enchère",
          texte: `L’enchère sur ${carteNom} sera annulée et la carte repassera en vente classique. Les offres restent consultables.`,
          libelle: "Annuler l’enchère",
          danger: true,
          action: () => actionAnnulerEnchere(id),
          succes: "Enchère annulée : la carte est en vente classique.",
        }}
      />
    </div>
  );
}

/** Écarter une offre fantaisiste (administrateur). */
export function EcarterOffre({ offre }: { offre: { id: string; nom: string; montant: string } }) {
  return (
    <Decision
      bouton="Écarter"
      variante="danger"
      confirmation={{
        titre: "Écarter l’offre",
        texte: `L’offre de ${offre.nom} (${offre.montant}) ne comptera plus. Cette décision est inscrite au journal.`,
        libelle: "Écarter l’offre",
        danger: true,
        action: () => actionEcarterOffre(offre.id),
        succes: "Offre écartée.",
      }}
    />
  );
}
