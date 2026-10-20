"use client";

import { useState } from "react";
import { Button } from "@/composants/ui/Button";
import { Field, Select } from "@/composants/ui/Field";
import { Modal } from "@/composants/ui/Modal";
import { Pilules, Seg } from "@/composants/ui/Seg";
import { Switch } from "@/composants/ui/Switch";

// Éléments interactifs de la page de référence (état local uniquement).

export function DemoSegSite() {
  const [type, setType] = useState("BATEAU");
  return (
    <Seg
      variante="site"
      libelle="Type de véhicule"
      valeur={type}
      onChange={setType}
      className="self-start"
      options={[
        { valeur: "BATEAU", libelle: "Bateaux", compteur: 4 },
        { valeur: "AVION", libelle: "Avions", compteur: 3 },
        { valeur: "HELICOPTERE", libelle: "Hélicoptères", compteur: 2 },
      ]}
    />
  );
}

export function DemoSwitchsSite() {
  return (
    <>
      <Switch variante="site" label="Disponible uniquement" cocheParDefaut />
      <Switch variante="site" label="Désactivé" />
    </>
  );
}

export function DemoPilules() {
  const [places, setPlaces] = useState("tous");
  return (
    <Pilules
      libelle="Nombre de places"
      valeur={places}
      onChange={setPlaces}
      options={[
        { valeur: "tous", libelle: "Tous" },
        { valeur: "1-2", libelle: "1 – 2" },
        { valeur: "3-6", libelle: "3 – 6" },
        { valeur: "7+", libelle: "7 +" },
      ]}
    />
  );
}

export function DemoSegPanel() {
  const [etat, setEtat] = useState("EN_COURS");
  return (
    <Seg
      libelle="État des contrats"
      valeur={etat}
      onChange={setEtat}
      options={[
        { valeur: "EN_COURS", libelle: "En cours", compteur: 5 },
        { valeur: "TERMINE", libelle: "Terminés", compteur: "6 cette semaine" },
      ]}
    />
  );
}

export function DemoSwitchPanel() {
  const [visible, setVisible] = useState(true);
  return (
    <span className="flex items-center gap-2">
      <Switch
        libelleAccessible="Afficher Seashark2 sur le site"
        coche={visible}
        onChange={setVisible}
      />
      <span className="text-[12.5px] text-texte-doux">{visible ? "Oui" : "Non"}</span>
    </span>
  );
}

export function DemoModal() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Button taille="panel" icone="plus" onClick={() => setOuvert(true)}>
        Nouveau mouvement
      </Button>
      <Modal
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        surtitre="Solde · S43"
        titre="Nouveau mouvement"
        actions={
          <>
            <Button variante="verre" taille="panel" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button taille="panel" icone="valider" onClick={() => setOuvert(false)}>
              Enregistrer le mouvement
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Montant" inputMode="numeric" placeholder="$0" />
          <Select
            label="Catégorie"
            options={[
              { valeur: "ENTRETIEN", libelle: "Entretien" },
              { valeur: "DIVERS", libelle: "Divers" },
            ]}
          />
        </div>
        <Field label="Motif" placeholder="Vidange et révision du Toro2" />
      </Modal>
    </>
  );
}
