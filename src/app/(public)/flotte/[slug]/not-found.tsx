import { PageIntrouvable } from "@/composants/site/PageIntrouvable";

export default function VehiculeIntrouvable() {
  return (
    <PageIntrouvable
      titre="Ce véhicule n’est pas dans la flotte"
      texte="Il a peut-être été retiré du site. Les autres appareils de la maison vous attendent."
    />
  );
}
