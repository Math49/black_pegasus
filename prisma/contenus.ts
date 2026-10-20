// Contenus initiaux du site (maquettes 01, 03 et 04), modifiables ensuite dans Paramètres.
// Mise en forme : voir src/lib/texteRiche.ts ; *texte* dans un titre = passage en or.
// Les valeurs paramétrables sont des variables remplacées à l'affichage :
//   {{telephone}} {{horaires}} {{toleranceRetardMin}} {{majorationRetardPourcent}}
//   {{seuilDefautRestitutionHeures}} {{forfait:<libellé exact d'un forfait de dégâts>}}

export const textesSite = {
  accroche: {
    titre: "Le ciel et l’océan, *à votre mesure*",
    texte:
      "Bateaux, avions et hélicoptères d’exception, préparés pour vous et remis en main propre. Choisissez votre appareil, appelez l’agence, signez sur place.",
  },
  etapes: [
    {
      titre: "Choisissez votre véhicule",
      texte: "Parcourez la flotte, comparez les tarifs et vérifiez les exemplaires disponibles.",
    },
    {
      titre: "Appelez l’agence",
      texte:
        "Depuis votre téléphone en jeu, composez le {{telephone}}. Nous confirmons le créneau et le lieu de remise.",
    },
    {
      titre: "Signez sur place",
      texte: "Le contrat et la caution se règlent à l’agence, puis les clés vous sont remises.",
    },
  ],
  maison: {
    titre: "Black Pégasus, l’art du départ",
    texte:
      "Née de la passion du voyage, la maison Black Pégasus met à la disposition des habitants de San Andreas une flotte choisie de bateaux, d’avions et d’hélicoptères. Chaque location se prépare au téléphone et se conclut en personne, à l’agence.",
    points: [
      "Chaque appareil contrôlé avant sa remise",
      "Un conseiller au bout du fil pour vous orienter",
      "Un contrat clair, signé sur place",
    ],
  },
};

export const reglement = {
  /** Contenu provisoire (D6) : affiché « [DATE] » tant qu'elle n'est pas renseignée. */
  dateMiseAJour: null as string | null,
  introduction:
    "Les conditions qui s’appliquent à chaque contrat signé avec Black Pégasus – American Transports. En signant à l’agence, le locataire les accepte sans réserve.",
  articles: [
    {
      titre: "Conditions de location",
      contenu: [
        "**1.1** La location est ouverte à toute personne présentant une pièce d’identité valide lors de la signature du contrat à l’agence.",
        "**1.2** Le pilotage d’un avion ou d’un hélicoptère exige une licence de pilote en cours de validité ; la conduite d’un bateau, un permis bateau.",
        "**1.3** Aucune réservation en ligne : chaque location se prépare par téléphone en jeu au {{telephone}}, puis se conclut à l’agence par la signature du contrat.",
        "**1.4** Le locataire est seul responsable du véhicule et de ses passagers pendant toute la durée de la location.",
      ].join("\n\n"),
    },
    {
      titre: "Tarification",
      contenu: [
        "**2.1** Les tarifs sont exprimés en dollars ($), à l’heure ou à la journée, et figurent sur la fiche de chaque véhicule.",
        "**2.2** Toute heure entamée est due.",
        "**2.3** Le règlement s’effectue à l’agence, au moment de la signature.",
        "> Le tarif journalier s’applique automatiquement dès qu’il est plus avantageux que le cumul des heures.",
      ].join("\n\n"),
    },
    {
      titre: "Caution",
      contenu: [
        "**3.1** Une caution est exigée pour chaque location. Son montant figure sur la fiche du véhicule.",
        "**3.2** Elle est versée à la signature et restituée au retour si le véhicule est rendu intact, à l’heure et au point convenu.",
        "**3.3** Tout ou partie de la caution peut être retenu pour couvrir un retard, des dégâts ou une pénalité.",
      ].join("\n\n"),
    },
    {
      titre: "Retards",
      contenu: [
        "**4.1** Le véhicule est rendu à l’heure fixée au contrat. Une tolérance de {{toleranceRetardMin}} minutes est accordée.",
        "**4.2** Au-delà, chaque heure entamée est facturée au tarif horaire majoré de {{majorationRetardPourcent}} %.",
        "**4.3** Un retard de plus de {{seuilDefautRestitutionHeures}} heures sans nouvelles du locataire est traité comme un défaut de restitution (article 6).",
      ].join("\n\n"),
    },
    {
      titre: "Dégâts et pénalités",
      contenu: [
        "**5.1** Un état des lieux est réalisé au départ et au retour. Tout dégât constaté au retour est à la charge du locataire.",
        [
          "| Constat | Pénalité |",
          "| --- | --- |",
          "| Rayures, éraflures légères | {{forfait:Rayures ou éraflures légères}} |",
          "| Dégât important (coque, fuselage, rotor) | Frais de réparation, dans la limite de la caution |",
          "| Réservoir non refait | {{forfait:Réservoir non refait}} |",
          "| Véhicule détruit | Caution retenue en totalité + [$ MONTANT] |",
          "| Usage lors d’une activité illégale | Caution retenue + exclusion de la clientèle |",
        ].join("\n"),
      ].join("\n\n"),
    },
    {
      titre: "Restitution",
      contenu: [
        "**6.1** Le véhicule est restitué au point de remise indiqué au contrat, en présence d’un agent Black Pégasus.",
        "**6.2** Il est rendu propre, réservoir plein, sans objet laissé à bord.",
        "**6.3** En cas de non-restitution, la caution est conservée et l’agence se réserve le droit de signaler le véhicule aux autorités.",
      ].join("\n\n"),
    },
  ],
};

/**
 * Textes de fiche connus (maquette 03) : premier paragraphe = accroche, « ## » = titre de la
 * présentation. Les autres véhicules restent sans description.
 */
export const descriptions: Record<string, string> = {
  luxor: [
    "Le vaisseau amiral de la flotte aérienne : une cabine de dix places et une autonomie taillée pour traverser San Andreas d’une traite.",
    "## Un salon privé à dix mille pieds",
    "Le Luxor accueille jusqu’à dix passagers et leurs bagages. Idéal pour un déplacement d’affaires, un départ vers Cayo Perico ou une soirée qui commence au-dessus des nuages.",
  ].join("\n\n"),
};
