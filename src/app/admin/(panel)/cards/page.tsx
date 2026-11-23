import { Suspense } from "react";
import { exigerPermission } from "@/lib/garde";
import { etatEnchere, finInitiale, meilleureOffre } from "@/domaine/encheres";
import { maintenant } from "@/lib/horloge";
import { lireCardsAdmin } from "@/services/cards";
import { lireEncheresOuvertes } from "@/services/encheres";
import { urlPhoto } from "@/services/stockage";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { GestionCards } from "@/composants/admin/cards/GestionCards";

export const metadata = { title: "Cartes" };

async function Contenu() {
  await exigerPermission("cards.gerer");
  const [{ categories, cartes }, encheres, instant] = await Promise.all([
    lireCardsAdmin(),
    lireEncheresOuvertes(),
    maintenant(),
  ]);
  return (
    <>
      <EnTetePanel titre="Cartes" fil={[{ libelle: "Cards" }, { libelle: "Cartes" }]} />
      <GestionCards
        maintenant={instant.toISOString()}
        categories={categories.map((c) => ({
          id: c.id,
          nom: c.nom,
          ordre: c.ordre,
          // Cartes actives seulement (les cartes retirées ne s'affichent plus).
          cartes: cartes.filter((x) => x.categorieId === c.id).length,
        }))}
        cartes={cartes.map((c) => ({
          id: c.id,
          categorieId: c.categorieId,
          nom: c.nom,
          prix: c.prix,
          stock: c.stock,
          ordre: c.ordre,
          visible: c.visible,
          photoUrl: c.photo ? urlPhoto(c.photo) : null,
          categorie: { nom: c.categorie.nom },
          enchere: (() => {
            const e = encheres.get(c.id);
            if (!e) return undefined;
            return {
              id: e.id,
              fin: e.finPrevue.toISOString(),
              finDuree: finInitiale(e.debut, e.dureeHeures).toISOString(),
              meilleure: meilleureOffre(e.offres)?.montant ?? null,
              montantDepart: e.montantDepart,
              etat: etatEnchere(e, e.offres, instant),
            };
          })(),
        }))}
      />
    </>
  );
}

export default function PageCartes() {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu />
    </Suspense>
  );
}
