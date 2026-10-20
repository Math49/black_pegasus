import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CarteInfo, CarteTelephone } from "@/composants/site/Cartes";
import { CarteVehicule } from "@/composants/site/CarteVehicule";
import { Avatar } from "@/composants/ui/Avatar";
import { Badge } from "@/composants/ui/Badge";
import { Button, IconButton, LienTexte } from "@/composants/ui/Button";
import { CadreIcone, Chip, Tag } from "@/composants/ui/Chip";
import { DataGrid } from "@/composants/ui/DataGrid";
import { Checkbox, Field, Select, TextArea } from "@/composants/ui/Field";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Kpi } from "@/composants/ui/Kpi";
import { NavItem } from "@/composants/ui/NavItem";
import { Rule } from "@/composants/ui/Rule";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import { disponibilite } from "@/domaine/disponibilite";
import {
  DemoModal,
  DemoPilules,
  DemoSegPanel,
  DemoSegSite,
  DemoSwitchPanel,
  DemoSwitchsSite,
} from "./Demos";

// Page de référence du design system (maquette 05), masquée en production.

export const metadata: Metadata = {
  title: "Système de composants · Black Pégasus",
  robots: { index: false, follow: false },
};

const PHOTO = "/images/vehicule-placeholder.jpg";

function Panneau({
  titre,
  children,
  className,
}: {
  titre: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard
      as="section"
      variante="site"
      className={`flex flex-col gap-[22px] rounded-[24px] p-[30px] ${className ?? ""}`}
    >
      <h2 className="m-0 libelle text-texte-doux">{titre}</h2>
      {children}
    </GlassCard>
  );
}

function Nuancier({
  fond,
  nom,
  valeur,
  verre,
}: {
  fond?: string;
  nom: string;
  valeur: string;
  verre?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={`h-[72px] rounded-[14px] border border-[var(--bp-trait-10)] ${verre ? "glass-site rounded-[14px]" : ""}`}
        style={fond ? { background: fond } : undefined}
      />
      <span className="text-[13px] font-bold">{nom}</span>
      <span className="text-xs text-texte-attenue">{valeur}</span>
    </div>
  );
}

function LigneTypo({ children, note }: { children: ReactNode; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      {children}
      <span className="text-xs whitespace-nowrap text-texte-attenue">{note}</span>
    </div>
  );
}

export default function PageComposants() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-noir">
      <Image src="/images/bg-mer.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--bp-black) 82%, transparent), color-mix(in srgb, var(--bp-black) 62%, transparent) 40%, color-mix(in srgb, var(--bp-black) 85%, transparent))",
        }}
      />

      <main className="relative mx-auto flex max-w-[1440px] flex-col gap-9 px-[72px] py-16 max-md:px-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-[18px]">
            <Image
              src="/images/bp-logo.png"
              alt="Black Pégasus"
              width={72}
              height={72}
              className="object-contain"
            />
            <div className="flex flex-col gap-1.5">
              <span className="libelle text-or-texte">Black Pégasus – American Transports</span>
              <h1 className="m-0 titre text-[40px] font-semibold">Système de composants</h1>
            </div>
          </div>
          <span className="text-sm text-texte-attenue">
            Montserrat · Manrope · Glassmorphism noir &amp; or
          </span>
        </header>

        <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
          <Panneau titre="Couleurs">
            <div className="grid grid-cols-4 gap-3.5">
              <Nuancier fond="var(--bp-black)" nom="Noir" valeur="#0A0A0C" />
              <Nuancier fond="var(--bp-surface)" nom="Surface" valeur="#131316" />
              <Nuancier fond="var(--bp-text)" nom="Texte" valeur="#EDEDF0" />
              <Nuancier fond="var(--bp-text-muted)" nom="Atténué" valeur="#8E8E96" />
            </div>
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-3.5">
              <Nuancier
                fond="var(--bp-gold-gradient)"
                nom="Or métallique"
                valeur="#A67C2E → #E8C877 → #C9A24A"
              />
              <Nuancier fond="var(--bp-silver-gradient)" nom="Argent" valeur="#C8C8CC → #EDEDF0" />
              <Nuancier verre nom="Verre" valeur="blanc 6 % · flou 26 px" />
            </div>
          </Panneau>

          <Panneau titre="Typographie">
            <div className="flex flex-col gap-3.5">
              <LigneTypo note="Titre 1 · Montserrat 600">
                <span className="titre text-[52px] leading-none font-semibold">
                  Le ciel <span className="texte-or font-bold">à votre mesure</span>
                </span>
              </LigneTypo>
              <LigneTypo note="Titre 2 · 34 px">
                <span className="titre text-[34px] font-semibold">Trois éléments</span>
              </LigneTypo>
              <LigneTypo note="Titre 3 · 22 px">
                <span className="titre text-[22px] font-semibold">Choisissez votre véhicule</span>
              </LigneTypo>
              <Rule />
              <LigneTypo note="Manrope 400">
                <span className="max-w-[360px] text-base leading-[1.7] text-texte-doux">
                  Texte courant en Manrope, 16 px, interligne 1,7.
                </span>
              </LigneTypo>
              <LigneTypo note="11 px · 0,24 em">
                <span className="libelle text-or-texte">Libellé en capitales espacées</span>
              </LigneTypo>
              <LigneTypo note="Prix · Manrope 800">
                <span className="flex items-baseline gap-3.5">
                  <span className="texte-or text-[36px] font-extrabold chiffres">
                    {formaterDollars(4500)}
                  </span>
                  <span className="texte-argent text-[22px] font-bold chiffres">
                    {formaterDollars(28000)}
                  </span>
                </span>
              </LigneTypo>
            </div>
          </Panneau>

          <Panneau titre="Boutons">
            <div className="flex flex-wrap items-center gap-3.5">
              <Button href="#" icone="telephone">
                Appeler le 555-XXXX
              </Button>
              <Button href="#" iconeFin="flecheDroite">
                Découvrir la flotte
              </Button>
              <Button href="#" variante="verre">
                Lire le règlement
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <Button href="#" taille="site-petit">
                Petit primaire
              </Button>
              <Button href="#" taille="site-petit" variante="verre">
                Petit secondaire
              </Button>
              <IconButton
                href="#"
                libelle="Voir"
                icone="flecheDroite"
                variante="or"
                taille="rond"
              />
              <IconButton href="#" libelle="Retour" icone="flecheGauche" taille="rond" />
              <LienTexte href="#">Lien texte</LienTexte>
            </div>
          </Panneau>

          <Panneau titre="Badges & pastilles">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                disponibilite={disponibilite([
                  { statut: "DISPONIBLE" },
                  { statut: "DISPONIBLE" },
                  { statut: "DISPONIBLE" },
                  { statut: "LOUE" },
                ])}
              />
              <Badge disponibilite={disponibilite([{ statut: "DISPONIBLE" }])} />
              <Badge disponibilite={disponibilite([{ statut: "LOUE" }])} />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Chip icone="personne">4 places</Chip>
              <Chip icone="colis">200 kg</Chip>
              <Chip>Jet-ski</Chip>
              <Chip>Vedette</Chip>
              <Chip>Jet privé</Chip>
            </div>
            <div className="flex flex-wrap gap-3.5">
              {(
                [
                  "bateau",
                  "avion",
                  "helicoptere",
                  "telephone",
                  "bouclierValide",
                  "horloge",
                ] as const
              ).map((i) => (
                <CadreIcone key={i} icone={i} />
              ))}
            </div>
          </Panneau>

          <Panneau titre="Champs">
            <div className="grid grid-cols-2 gap-4">
              <Field
                variante="site"
                label="Rechercher"
                icone="recherche"
                placeholder="Nom du véhicule"
              />
              <Field
                variante="site"
                label="État actif"
                icone="recherche"
                defaultValue="Luxor"
                data-apercu-focus
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
              <Checkbox label="Jet privé" defaultChecked />
              <Checkbox label="Hydravion" />
              <DemoSwitchsSite />
            </div>
            <DemoPilules />
          </Panneau>

          <Panneau titre="Onglets">
            <DemoSegSite />
            <nav
              aria-label="Exemple de navigation"
              className="flex gap-[30px] border-b border-[var(--bp-trait-8)]"
            >
              <a className="bp-nav-lien" href="#" aria-current="page">
                Accueil
              </a>
              <a className="bp-nav-lien" href="#">
                La flotte
              </a>
              <a className="bp-nav-lien" href="#">
                Règlement
              </a>
              <a className="bp-nav-lien" href="#">
                La maison
              </a>
            </nav>
            <div className="flex max-w-[300px] flex-col gap-1">
              <a className="bp-sommaire-lien" href="#" aria-current="location">
                <span className="bp-sommaire-lien__num">01</span>Conditions de location
              </a>
              <a className="bp-sommaire-lien" href="#">
                <span className="bp-sommaire-lien__num">02</span>Tarification
              </a>
            </div>
          </Panneau>

          <Panneau titre="Cartes" className="col-span-full">
            <div className="grid grid-cols-[1.1fr_1.1fr_0.8fr] items-start gap-6 max-lg:grid-cols-1">
              <CarteVehicule
                vehicule={{
                  slug: "seashark2",
                  nom: "Seashark2",
                  type: "BATEAU",
                  categorie: "Jet-ski",
                  prixHeure: 150,
                  prixJour: 900,
                  places: 2,
                  contenanceKg: 20,
                  photoUrl: PHOTO,
                }}
                disponibilite={disponibilite([
                  { statut: "DISPONIBLE" },
                  { statut: "DISPONIBLE" },
                  { statut: "DISPONIBLE" },
                  { statut: "LOUE" },
                ])}
              />
              <CarteVehicule
                vehicule={{
                  slug: "remorqueur",
                  nom: "Remorqueur",
                  type: "BATEAU",
                  categorie: "Remorqueur",
                  prixHeure: 800,
                  prixJour: 4800,
                  places: 4,
                  contenanceKg: 2000,
                  photoUrl: PHOTO,
                }}
                disponibilite={disponibilite([{ statut: "MAINTENANCE" }])}
              />
              <div className="flex flex-col gap-[18px]">
                <CarteInfo
                  icone="personne"
                  valeur="10"
                  libelle="Places"
                  className="max-w-[190px]"
                />
                <CarteTelephone telephone="555-XXXX" horaires="Tous les jours · 14h – 02h" />
              </div>
            </div>
          </Panneau>
        </div>

        {/* ── Composants du panel (hors maquette 05, CSS des maquettes 10–22) ── */}
        <GlassCard
          as="section"
          variante="admin"
          className="flex flex-col gap-8 rounded-[24px] p-[30px]"
        >
          <h2 className="m-0 libelle text-texte-doux">Panel d’administration</h2>

          <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
            <div className="flex flex-col gap-4">
              <h3 className="m-0 libelle">Boutons</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button taille="panel" icone="plus">
                  Nouveau contrat
                </Button>
                <Button taille="panel" variante="verre" icone="telecharger">
                  Exporter
                </Button>
                <Button taille="panel" variante="danger" icone="corbeille">
                  Supprimer le véhicule
                </Button>
                <Button taille="panel" icone="cadenas" disabled>
                  Clôturer la semaine
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button taille="panel-petit" variante="verre" icone="crayon">
                  Modifier
                </Button>
                <IconButton libelle="Notifications" icone="cloche" />
                <IconButton libelle="Modifier Seashark2" icone="crayon" taille="tableau" />
                <IconButton libelle="Télécharger le PDF" icone="pdf" taille="tableau" />
                <IconButton
                  libelle="Supprimer l’exemplaire"
                  icone="corbeille"
                  taille="tableau"
                  variante="danger"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="m-0 libelle">Statuts et étiquettes</h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <Statut ton="alerte">Retard · 40 min</Statut>
                <Statut ton="ok" icone="horloge">
                  Dans 20 min
                </Statut>
                <Statut>Dans 1 h 20</Statut>
                <Statut ton="or">Administrateur</Statut>
                <Statut ton="ok" icone="hausse">
                  +$102 250 · +24,8 %
                </Statut>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Tag>Jet-ski</Tag>
                <Tag>Jet privé</Tag>
                <Tag icone="trombone">JUST-43-03</Tag>
              </div>
              <div className="flex items-center gap-3">
                <Avatar nom="Vincent Moretti" anneau />
                <Avatar nom="Lena Castillo" taille={32} />
                <span className="text-sm text-texte-doux">
                  Avatars (initiales sans photo Discord)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="m-0 libelle">Champs</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Client (nom RP)" placeholder="Prénom Nom" />
                <Field label="Téléphone en jeu" defaultValue="555-01" erreur="Numéro incomplet" />
                <Select
                  label="Modèle"
                  options={[
                    { valeur: "toro2", libelle: "Toro2 · $600 / h" },
                    { valeur: "luxor", libelle: "Luxor · $4 500 / h" },
                  ]}
                />
                <Field
                  label="Début"
                  type="datetime-local"
                  defaultValue="2026-10-24T22:00"
                  aide="Heure du serveur"
                />
              </div>
              <TextArea
                label="Note d’état des lieux"
                placeholder="Rayures légères sur le patin gauche"
              />
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="m-0 libelle">Onglets, interrupteur, navigation</h3>
              <DemoSegPanel />
              <DemoSwitchPanel />
              <nav
                aria-label="Exemple de barre latérale"
                className="flex max-w-[256px] flex-col gap-1"
              >
                <NavItem href="#" icone="tableauDeBord" actif>
                  Tableau de bord
                </NavItem>
                <NavItem href="#" icone="avion" compteur={9}>
                  Véhicules
                </NavItem>
                <NavItem href="#" icone="contrat" compteur="1 retard" compteurAlerte>
                  Contrats
                </NavItem>
              </nav>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
            <Kpi
              libelle="Chiffre d’affaires · S43"
              icone="hausse"
              iconeOr
              valeur={formaterDollars(91400)}
              contexte="+8,0 % vs S42 · locations et pénalités"
            />
            <Kpi
              libelle="Dépenses · S43"
              icone="baisse"
              valeur={formaterDollars(24150)}
              contexte="dont impôts S42 : $12 600"
            />
            <Kpi
              libelle="Contrats en cours"
              icone="contrat"
              valeur="5"
              contexte={<Statut ton="alerte">1 en retard</Statut>}
            />
            <Kpi
              libelle="Résultat imposable"
              icone="balance"
              iconeOr
              valeurOr
              valeur={formaterDollars(67250)}
              contexte="Recettes − dépenses"
            />
          </div>

          <GlassCard variante="admin" className="overflow-x-auto p-2">
            <DataGrid
              libelle="Contrats en cours"
              colonnes={[
                { cle: "numero", titre: "N°", largeur: "130px" },
                { cle: "client", titre: "Client", largeur: "minmax(150px, 1fr)" },
                { cle: "vehicule", titre: "Véhicule", largeur: "160px" },
                { cle: "location", titre: "Location", largeur: "100px", alignement: "droite" },
                { cle: "statut", titre: "Statut", largeur: "150px" },
                { cle: "action", titre: "Actions", largeur: "40px", titreMasque: true },
              ]}
              lignes={[
                {
                  cle: "39",
                  ton: "alerte",
                  cellules: {
                    numero: "CTR-2026-0039",
                    client: "Chen Wu",
                    vehicule: "Seashark2 · BP SH 01",
                    location: formaterDollars(300),
                    statut: <Statut ton="alerte">Retard · 40 min</Statut>,
                    action: (
                      <IconButton
                        libelle="Clôturer CTR-2026-0039"
                        icone="chevronDroite"
                        taille="tableau"
                      />
                    ),
                  },
                },
                {
                  cle: "38",
                  cellules: {
                    numero: "CTR-2026-0038",
                    client: "Kenji Mori",
                    vehicule: "Streamer216 · BP ST 01",
                    location: formaterDollars(7500),
                    statut: (
                      <Statut ton="ok" icone="horloge">
                        Dans 20 min
                      </Statut>
                    ),
                    action: (
                      <IconButton
                        libelle="Clôturer CTR-2026-0038"
                        icone="chevronDroite"
                        taille="tableau"
                      />
                    ),
                  },
                },
                {
                  cle: "inactif",
                  ton: "inactif",
                  cellules: {
                    numero: "CTR-2026-0031",
                    client: "Jimmy Calloway",
                    vehicule: "Seashark2 · BP SH 02",
                    location: formaterDollars(300),
                    statut: <Statut>Terminé</Statut>,
                  },
                },
              ]}
            />
          </GlassCard>

          <div className="flex items-center gap-4">
            <DemoModal />
            <span className="text-sm text-texte-doux">
              Modale (dialog natif, fond flouté et assombri)
            </span>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
