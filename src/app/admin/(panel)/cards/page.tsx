import { Suspense } from "react";
import { exigerPermission } from "@/lib/garde";
import { lireCardsAdmin } from "@/services/cards";
import { urlPhoto } from "@/services/stockage";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { GestionCards } from "@/composants/admin/cards/GestionCards";

export const metadata = { title: "Cartes" };

async function Contenu() {
  await exigerPermission("cards.gerer");
  const { categories, cartes } = await lireCardsAdmin();
  return (
    <>
      <EnTetePanel titre="Cartes" fil={[{ libelle: "Cards" }, { libelle: "Cartes" }]} />
      <GestionCards
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
